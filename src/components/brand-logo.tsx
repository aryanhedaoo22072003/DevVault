import Image from 'next/image';

type BrandLogoProps = {
  compact?: boolean;
  priority?: boolean;
};

export function BrandLogo({ compact = false, priority = false }: BrandLogoProps) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-emerald-300/15 bg-[#061216] shadow-[0_8px_24px_rgba(20,184,166,0.12)]">
        <Image
          src="/branding/devvault-vault-icon.png"
          alt=""
          fill
          sizes="40px"
          priority={priority}
          className="object-cover"
        />
      </span>
      {compact ? null : (
        <span className="hidden text-lg font-semibold tracking-tight text-white sm:block">
          Dev<span className="text-amber-200">Vault</span>
        </span>
      )}
    </span>
  );
}

export function BrandLockup() {
  return (
    <Image
      src="/branding/devvault-logo-lockup.webp"
      alt="DevVault"
      width={740}
      height={608}
      sizes="(max-width: 768px) 180px, 210px"
      className="h-auto w-[180px] rounded-2xl object-contain md:w-[210px]"
    />
  );
}
