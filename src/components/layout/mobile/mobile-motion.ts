// Mobile presentation only. Shared/desktop components must not import this module.
export const mobileSpring = {
  type: "spring",
  duration: 0.3,
  bounce: 0,
} as const

export const mobileInstant = { duration: 0 } as const
