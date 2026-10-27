import { useLanguage } from "@/components/language-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const languages = [
  { code: "en", label: "English", country: "Ghana", flag: "gh" },
  { code: "fr", label: "Français", country: "France", flag: "fr" },
] as const

function Flag({ code }: { code: "gh" | "fr" }) {
  return (
    <img
      src={`https://flagcdn.io/4x3/32/${code}.png`}
      width={32}
      height={24}
      alt=""
      loading="lazy"
      className="h-5 w-7 shrink-0 rounded-sm object-cover shadow-sm"
    />
  )
}

export function LanguageSetting() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <Select
      value={language}
      onValueChange={(value) => {
        if (value === "en" || value === "fr") setLanguage(value)
      }}
    >
      <SelectTrigger className="w-full max-w-72" aria-label={t("Language")}>
        <SelectValue>
          {(value) => {
            const option = languages.find((item) => item.code === value)
            return option ? (
              <>
                <Flag code={option.flag} />
                {option.label}
              </>
            ) : null
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {languages.map((option) => (
          <SelectItem key={option.code} value={option.code}>
            <Flag code={option.flag} />
            <span>{option.label}</span>
            <span className="text-xs text-muted-foreground">
              {option.country}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
