import * as React from "react"
import { HashRouter, Route, Routes } from "react-router"

import { AppShell } from "@/components/app-shell"
import { CreateProvider } from "@/components/create-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ensureSeeded } from "@/lib/db"
import { BanksPage } from "@/pages/banks-page"
import { HomePage } from "@/pages/home-page"
import { InvestmentDetailPage } from "@/pages/investment-detail-page"
import { InvestmentsPage } from "@/pages/investments-page"
import { LedgerPage } from "@/pages/ledger-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { PartiesPage } from "@/pages/parties-page"
import { ReportsPage } from "@/pages/reports-page"
import { SettingsPage } from "@/pages/settings-page"

export function App() {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    void ensureSeeded().then(() => setReady(true))
  }, [])

  return (
    <HashRouter>
      <TooltipProvider>
        <CreateProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/pagar" element={<LedgerPage kind="payable" />} />
              <Route
                path="/receber"
                element={<LedgerPage kind="receivable" />}
              />
              <Route path="/investimentos" element={<InvestmentsPage />} />
              <Route
                path="/investimentos/:id"
                element={<InvestmentDetailPage />}
              />
              <Route
                path="/fornecedores"
                element={<PartiesPage role="supplier" />}
              />
              <Route path="/clientes" element={<PartiesPage role="client" />} />
              <Route path="/bancos" element={<BanksPage />} />
              <Route path="/relatorios" element={<ReportsPage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </CreateProvider>
        <Toaster />
        {!ready ? <span className="sr-only">Carregando base local</span> : null}
      </TooltipProvider>
    </HashRouter>
  )
}

export default App
