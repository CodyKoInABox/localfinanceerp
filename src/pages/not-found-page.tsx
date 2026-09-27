import { Link } from "react-router"

import { PageHeader, PageStack } from "@/components/page-header"
import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <PageStack>
      <PageHeader
        title="Página não encontrada"
        description="Esse endereço não existe neste ERP."
      />
      <Button asChild variant="outline">
        <Link to="/">Voltar ao início</Link>
      </Button>
    </PageStack>
  )
}
