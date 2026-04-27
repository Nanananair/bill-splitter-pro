import { Toaster } from "sonner"
import { Header } from "@/components/Header"
import { PeopleEditor } from "@/components/PeopleEditor"
import { ItemEditor } from "@/components/ItemEditor"
import { ReceiptScanner } from "@/components/ReceiptScanner"
import { BillTableDesktop } from "@/components/BillTableDesktop"
import { BillCardsMobile } from "@/components/BillCardsMobile"
import { SummarySheet } from "@/components/SummarySheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <Header />

      {/* Mobile: tabbed flow + sticky totals sheet */}
      <main className="container max-w-6xl py-4 lg:hidden">
        <Tabs defaultValue="setup">
          <TabsList className="w-full">
            <TabsTrigger value="setup" className="flex-1">
              Setup
            </TabsTrigger>
            <TabsTrigger value="bill" className="flex-1">
              Bill
            </TabsTrigger>
          </TabsList>
          <TabsContent value="setup" className="flex flex-col gap-3">
            <ReceiptScanner />
            <PeopleEditor />
            <ItemEditor />
          </TabsContent>
          <TabsContent value="bill">
            <BillCardsMobile />
          </TabsContent>
        </Tabs>
        <SummarySheet variant="stickyMobile" />
      </main>

      {/* Desktop: 3-column layout */}
      <main className="container hidden max-w-6xl gap-4 py-4 lg:grid lg:grid-cols-[20rem_1fr_18rem]">
        <aside className="flex flex-col gap-3">
          <ReceiptScanner />
          <PeopleEditor />
          <ItemEditor />
        </aside>
        <section className="rounded-md border bg-card p-3">
          <BillTableDesktop />
        </section>
        <aside className="rounded-md border bg-card p-3">
          <SummarySheet variant="panelDesktop" />
        </aside>
      </main>

      <Toaster richColors closeButton position="top-right" theme="system" />
    </div>
  )
}
