import * as React from "react"
import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { CatalogItem } from "@/lib/schema"

export function CatalogEditor({
  title,
  description,
  items,
  onAdd,
  onRename,
  onDelete,
}: {
  title: string
  description: string
  items: CatalogItem[]
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [name, setName] = React.useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const trimmed = name.trim()
            if (!trimmed) {
              return
            }
            void onAdd(trimmed).then(() => setName(""))
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Novo tipo"
            aria-label={`Novo ${title.toLowerCase()}`}
          />
          <Button type="submit" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Adicionar
          </Button>
        </form>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <Input
                defaultValue={item.name}
                aria-label={item.name}
                onBlur={(event) => {
                  const trimmed = event.target.value.trim()
                  if (!trimmed || trimmed === item.name) {
                    event.target.value = item.name
                    return
                  }
                  void onRename(item.id, trimmed)
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Excluir ${item.name}`}
                onClick={() => void onDelete(item.id)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
