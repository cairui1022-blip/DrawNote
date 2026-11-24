import test from 'node:test';
import assert from 'node:assert/strict';
import {
  IMAGE_PROVIDER_PRESETS,
  buildProviderRequestSpec,
  createDefaultQuotaRecord,
  extractImageCandidateFromPayload,
  isPrivateOrLoopbackIp,
  mapRatioToDimensions,
  maskApiKey,
  redeemCodeOnQuota,
  refundOneCredit,
  reserveOneCredit,
  toAdminImageModel,
  validateProviderEndpointUrl,
  type StoredImageModelRecord,
} from './imageProviders';

test('maskApiKey never exposes raw API keys and masks middle characters', () => {
  assert.equal(maskApiKey(''), '');
  assert.equal(maskApiKey('short'), '****');
  assert.equal(maskApiKey('sk-1234567890abcdef'), 'sk-1****cdef');

  const stored: StoredImageModelRecord = {
    id: 'qwen-default',
    label: '通义千问 Qwen',
    provider: 'qwen',
    modelName: 'qwen-image-2.0',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    apiKey: 'sk-secret-key-9988',
    enabled: true,
    isDefault: true,
    supportedRatios: ['3:4', '1:1'],
  };
  const adminView = toAdminImageModel(stored);
  assert.equal(adminView.hasApiKey, true);
  assert.equal(adminView.apiKeyMasked, 'sk-s****9988');
  assert.equal(JSON.stringify(adminView).includes('sk-secret-key-9988'), false);
});

test('validateProviderEndpointUrl enforces HTTPS and blocks loopback/private/SSRF addresses', () => {
  assert.equal(validateProviderEndpointUrl('https://dashscope.aliyuncs.com/api/v1/').ok, true);
  assert.equal(validateProviderEndpointUrl('https://ark.cn-beijing.volces.com/api/v3').ok, true);

  assert.equal(validateProviderEndpointUrl('http://dashscope.aliyuncs.com/api/v1').ok, false);
  assert.equal(validateProviderEndpointUrl('https://localhost:8080/v1').ok, false);
  assert.equal(validateProviderEndpointUrl('https://127.0.0.1/v1').ok, false);
  assert.equal(validateProviderEndpointUrl('https://169.254.169.254/latest').ok, false);
  assert.equal(validateProviderEndpointUrl('https://10.0.0.5/v1').ok, false);
  assert.equal(validateProviderEndpointUrl('https://192.168.1.10/v1').ok, false);
  assert.equal(validateProviderEndpointUrl('https://[::1]/v1').ok, false);
  assert.equal(validateProviderEndpointUrl('https://user:pass@api.example.com/v1').ok, false);

  assert.equal(isPrivateOrLoopbackIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrLoopbackIp('172.16.5.4'), true);
  assert.equal(isPrivateOrLoopbackIp('8.8.8.8'), false);
});

test('buildProviderRequestSpec builds correct Qwen and Jimeng payloads and extracts images', () => {
  assert.equal(IMAGE_PROVIDER_PRESETS.qwen.defaultModelName, 'qwen-image-2.0');

  const qwenSpec = buildProviderRequestSpec({
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    apiKey: 'sk-qwen-test',
    modelName: 'qwen-image-2.0',
    prompt: '温暖手绘咖啡馆插画',
    ratio: '3:4',
    negativePrompt: '水印',
  });
  assert.equal(
    qwenSpec.endpoint,
    'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation'
  );
  assert.equal(qwenSpec.isAsyncTask, false);
  assert.equal(mapRatioToDimensions('3:4', 'qwen', 'qwen-image-2.0').asterisk, '1140*1472');

  const wanxSpec = buildProviderRequestSpec({
    provider: 'qwen',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
    apiKey: 'sk-qwen-test',
    modelName: 'wanx2.1-t2i-turbo',
    prompt: '温暖手绘咖啡馆插画',
    ratio: '4:3',
  });
  assert.equal(wanxSpec.isAsyncTask, true);
  assert.equal(wanxSpec.headers['X-DashScope-Async'], 'enable');
  assert.equal(mapRatioToDimensions('4:3', 'qwen', 'wanx2.1-t2i-turbo').asterisk, '1024*768');

  const jimengSpec = buildProviderRequestSpec({
    provider: 'jimeng',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKey: 'ark-test',
    modelName: 'doubao-seedream-3-0-t2i-250415',
    prompt: '温暖手绘咖啡馆插画',
    ratio: '16:9',
  });
  assert.equal(jimengSpec.endpoint, 'https://ark.cn-beijing.volces.com/api/v3/images/generations');
  assert.equal(jimengSpec.body.size, '1280x720');

  assert.equal(
    extractImageCandidateFromPayload({
      output: { choices: [{ message: { content: [{ image: 'https://cdn.example.com/a.png' }] } }] },
    }).url,
    'https://cdn.example.com/a.png'
  );
  assert.equal(
    extractImageCandidateFromPayload({ data: [{ url: 'https://ark.example.com/img.png' }] }).url,
    'https://ark.example.com/img.png'
  );
  assert.equal(
    extractImageCandidateFromPayload({ output: { task_id: 'task_99', task_status: 'PENDING' } })
      .taskId,
    'task_99'
  );
});

test('5-credit per-user quota enforces limit, supports refund on failure, and prevents duplicate code redeem', () => {
  let quota = createDefaultQuotaRecord('username:alice', '2026/11/24 10:00:00');
  assert.equal(quota.totalCredits, 5);
  assert.equal(quota.creditsGift, 5);

  // Spend 5 credits
  for (let i = 0; i < 5; i += 1) {
    const res = reserveOneCredit(quota, 'Qwen');
    assert.equal(res.ok, true);
    if (res.ok) quota = res.nextQuota;
  }
  assert.equal(quota.totalCredits, 0);
  assert.equal(quota.usedCount, 5);

  // 6th attempt fails
  const exhausted = reserveOneCredit(quota, 'Qwen');
  assert.equal(exhausted.ok, false);

  // Refund restores exact 1 credit
  quota = refundOneCredit(quota, 'gift', 'Upstream timeout');
  assert.equal(quota.totalCredits, 1);
  assert.equal(quota.usedCount, 4);

  // Redeem code adds +5 once
  const redeemOk = redeemCodeOnQuota(quota, 'HR-2026-DRAW');
  assert.equal(redeemOk.ok, true);
  if (redeemOk.ok) {
    quota = redeemOk.nextQuota;
    assert.equal(quota.totalCredits, 6);
  }
  const redeemDup = redeemCodeOnQuota(quota, 'hr-2026-draw');
  assert.equal(redeemDup.ok, false);
});
