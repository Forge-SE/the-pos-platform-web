import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export function PinInput({
  id,
  value,
  onChange,
  invalid,
  autoFocus,
  autoComplete = "current-password",
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid: boolean
  autoFocus?: boolean
  autoComplete?: "current-password" | "new-password"
}) {
  return (
    <InputOTP
      id={id}
      value={value}
      onChange={onChange}
      maxLength={4}
      inputMode="numeric"
      autoComplete={autoComplete}
      aria-invalid={invalid}
      containerClassName="w-auto justify-center"
      autoFocus={autoFocus}
    >
      <InputOTPGroup
        aria-invalid={invalid}
        className="flex w-auto justify-center gap-2"
      >
        {[0, 1, 2, 3].map((index) => (
          <InputOTPSlot
            key={index}
            index={index}
            masked
            className="size-12 rounded-md border bg-muted/30 text-lg first:rounded-md first:border last:rounded-md"
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
