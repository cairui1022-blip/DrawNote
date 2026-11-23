import { ArrowLeft } from 'lucide-react';

interface PolicyViewProps {
  onBack: () => void;
}

export function PolicyView({ onBack }: PolicyViewProps) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:px-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--ink)] hover:text-[var(--seal)] hover:underline underline-offset-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>返回上一页</span>
      </button>

      <article className="space-y-6 rounded-[6px] border border-[var(--border)] bg-[var(--paper)] p-7 sm:p-10">
        <header className="border-b border-[var(--border)] pb-5">
          <p className="font-tabular text-[11px] font-semibold tracking-[0.1em] text-[var(--seal)]">
            POLICY · TERMS &amp; PRIVACY
          </p>
          <h1 className="mt-1.5 font-editorial text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            使用与隐私说明
          </h1>
          <p className="mt-2 text-xs text-[var(--muted)]">
            清晰透明地说明你的账号、创作记录与数据边界。
          </p>
        </header>

        <section className="space-y-2">
          <h2 className="font-editorial text-base font-semibold text-[var(--ink)]">
            01. 账号与提示词使用
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            支持通过账号名一键注册/登录，或通过邮箱验证码登录。登录后的提示词生成功能不设业务次数上限，且不消耗生图额度；系统仅保留必要的频率保护以保障服务稳定。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-base font-semibold text-[var(--ink)]">
            02. 生图额度说明
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            新账号首次注册建档即赠送 5 次生图额度，永不过期。站内生图上线后，仅在成功交付图片时扣除 1 次；任务失败或取消将自动退还，且优先消耗赠送额度。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-base font-semibold text-[var(--ink)]">
            03. 数据存储与创作隐私
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            账号名与邮箱仅用于身份识别、任务隔离与上线提醒通知。你的创作草稿、提示词记录及后续作品按账号严格隔离，退出登录不会丢失已保存的账号额度与记录。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-base font-semibold text-[var(--ink)]">
            04. 内容规范与安全画风模式
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            请仅提交你拥有合法使用权的文案与主题内容。画风库用于辅助视觉构思与笔触描述，如需在外部商业生图平台避免艺术家姓名审核限制，可随时在画案切换「去作者名安全版」提示词格式。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-editorial text-base font-semibold text-[var(--ink)]">
            05. 联系与账号注销
          </h2>
          <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
            如对隐私条款、数据导出或账号注销有任何疑问，可通过官方支持邮箱 support@drawnote.app 联系我们，我们将在收到核验请求后及时处理。
          </p>
        </section>
      </article>
    </div>
  );
}
