import { useEffect, useState } from "react"
import { gql } from "@apollo/client"
import { useQuery } from "@apollo/client/react"
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from "@/components/ui/combobox"

const LOOKUP = gql`
  query CounterCustomerLookup($search: String!) {
    customerLookup(search: $search) {
      id
      name
      phone
      consentStatus
    }
  }
`
interface CustomerOption {
  id: string
  name: string
  phone: string
  consentStatus: string
}

export function CustomerLookup({
  offline,
  value,
  onChange,
  onSelect,
}: {
  offline: boolean
  value: string
  onChange: (value: string) => void
  onSelect: (customer: CustomerOption) => void
}) {
  const search = value
  const [term, setTerm] = useState("")
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])
  const { data, loading, error } = useQuery<{
    customerLookup: CustomerOption[]
  }>(LOOKUP, {
    variables: { search: term },
    skip: offline || term.length < 2,
    fetchPolicy: "network-only",
  })
  const options =
    search.trim() === term && !offline ? (data?.customerLookup ?? []) : []
  return (
    <div className="space-y-2">
      <Combobox<CustomerOption>
        items={options}
        filter={null}
        inputValue={search}
        onInputValueChange={onChange}
        itemToStringLabel={(item) => item.name}
        onValueChange={(item) => {
          if (item) onSelect(item)
        }}
      >
        <ComboboxInput
          className="w-full"
          aria-label="Customer name"
          placeholder="Full name (optional)"
        />
        <ComboboxContent className="z-[60]">
          <ComboboxList>
            {(item: CustomerOption) => (
              <ComboboxItem key={item.id} value={item}>
                <span className="flex flex-col">
                  <span>{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.phone}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-xs text-muted-foreground" role="status">
        {offline
          ? "Customer lookup is unavailable offline. Fill in the details below."
          : loading
            ? "Finding customers..."
            : error
              ? "Customer lookup is unavailable. Fill in the details below."
              : term.length >= 2 && options.length === 0
                ? "New customer. Continue with their phone number below."
                : "Type a new name or select a returning customer."}
      </p>
    </div>
  )
}
