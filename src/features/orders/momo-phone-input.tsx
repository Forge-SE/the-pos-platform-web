import { useState } from "react"
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js"
import type { CountryCode } from "libphonenumber-js"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const names = new Intl.DisplayNames(["en"], { type: "region" })
const countries = getCountries().sort((a, b) =>
  (names.of(a) ?? a).localeCompare(names.of(b) ?? b)
)
function Flag({ country }: { country: CountryCode }) {
  return (
    <img
      src={`https://flagcdn.io/4x3/32/${country.toLowerCase()}.png`}
      alt=""
      width={24}
      height={18}
      className="h-4 w-6 shrink-0 rounded-sm object-cover"
    />
  )
}
export function MomoPhoneInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [selected, setSelected] = useState<CountryCode>("GH")
  const parsed = parsePhoneNumberFromString(value, selected)
  const country = parsed?.country ?? selected
  const dial = getCountryCallingCode(country)
  const digits = value.replace(/\D/g, "")
  const display =
    parsed?.nationalNumber ??
    (value.startsWith("+") && digits.startsWith(dial)
      ? digits.slice(dial.length)
      : digits)
  return (
    <div className="flex min-w-0 gap-2">
      <Select
        value={country}
        onValueChange={(next) => {
          if (!next || !countries.includes(next)) return
          const code = next
          setSelected(code)
          onChange(display ? `+${getCountryCallingCode(code)}${display}` : "")
        }}
      >
        <SelectTrigger aria-label="MoMo country code" className="w-32 shrink-0">
          <SelectValue>
            <Flag country={country} />
            <span>+{dial}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="z-[60]">
          {countries.map((code) => (
            <SelectItem key={code} value={code}>
              <Flag country={code} />
              {names.of(code) ?? code} (+{getCountryCallingCode(code)})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-label="MoMo wallet number"
        placeholder="Mobile number"
        value={display}
        onChange={(event) => {
          const raw = event.target.value
          const next = raw.replace(/\D/g, "")
          if (!next) {
            onChange("")
            return
          }
          if (raw.startsWith("+")) {
            const international = parsePhoneNumberFromString(raw)
            if (international?.country) setSelected(international.country)
            onChange(`+${next}`)
          } else {
            const national = parsePhoneNumberFromString(next, country)
            onChange(national?.number ?? `+${dial}${next}`)
          }
        }}
        className="min-w-0 flex-1"
      />
    </div>
  )
}
