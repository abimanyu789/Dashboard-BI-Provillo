import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxItem {
    value: string | number;
    label: string;
}

export interface SearchableComboboxProps {
    items: ComboboxItem[];
    value?: string | number;
    onValueChange: (value: string | number) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    className?: string;
    disabled?: boolean;
}

export function SearchableCombobox({
    items,
    value,
    onValueChange,
    placeholder = "Pilih item...",
    searchPlaceholder = "Cari...",
    emptyText = "Tidak ditemukan.",
    className,
    disabled = false,
}: SearchableComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState('')

    const selectedItem = items.find((item) => item.value === value)

    const filtered = search.trim() === ''
        ? items
        : items.filter((item) =>
              item.label.toLowerCase().includes(search.toLowerCase())
          )

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <span className="truncate">
                        {selectedItem ? selectedItem.label : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {filtered.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={String(item.value)}
                                    onSelect={() => {
                                        onValueChange(item.value)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 flex-shrink-0 size-4",
                                            value === item.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{item.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
