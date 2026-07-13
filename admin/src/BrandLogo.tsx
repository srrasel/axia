import clsx from 'clsx'
import logo from './assets/logo.png'
import logoWhite from './assets/logo-white.png'

type BrandLogoProps = {
  className?: string
  /** `light` = dark logo on light bg; `dark` = white logo on dark bg */
  variant?: 'light' | 'dark'
  alt?: string
}

/** NitajFX mark for admin — use white on the dark sidebar. */
export function BrandLogo({ className, variant = 'light', alt = 'NitajFX' }: BrandLogoProps) {
  return (
    <img
      src={variant === 'dark' ? logoWhite : logo}
      alt={alt}
      className={clsx('h-8 w-auto object-contain', className)}
      draggable={false}
    />
  )
}
