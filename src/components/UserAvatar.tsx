import clsx from 'clsx'

/** Default silhouette when the user has no profile photo. */
export function UserIcon({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      role="presentation"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      data-icon="icon-user"
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M18 8A6 6 0 1 1 6 8a6 6 0 0 1 12 0Zm-2 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        d="M19.88 21.165c.13.45.499.835.966.835.637 0 1.167-.523 1.021-1.144C21.087 17.534 16.967 15 12 15c-4.966 0-9.087 2.534-9.867 5.856-.146.62.384 1.144 1.02 1.144.468 0 .838-.386.967-.835.245-.851.873-1.718 1.956-2.476C7.51 17.685 9.599 17 12 17c2.401 0 4.49.685 5.924 1.689 1.083.758 1.71 1.625 1.956 2.476Z"
      />
    </svg>
  )
}

type UserAvatarProps = {
  photoUrl?: string | null
  name?: string | null
  /** Outer circle size in px (default 40). */
  size?: number
  className?: string
  ring?: boolean
  /** No background or ring — icon/photo only. */
  plain?: boolean
}

/**
 * Shows the user's photo when available; otherwise the default user silhouette icon.
 */
export function UserAvatar({ photoUrl, name, size = 40, className, ring, plain }: UserAvatarProps) {
  const iconSize = Math.round(size * 0.55)

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ? `${name} avatar` : 'User avatar'}
        width={size}
        height={size}
        className={clsx(
          'shrink-0 rounded-full object-cover',
          ring && !plain && 'ring-2 ring-border/60',
          className,
        )}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full border border-[aliceblue] text-text-secondary',
        !plain && 'bg-muted',
        ring && !plain && 'ring-2 ring-border/60',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden={!name}
      aria-label={name ? `${name} avatar` : undefined}
    >
      <UserIcon size={iconSize} />
    </span>
  )
}
