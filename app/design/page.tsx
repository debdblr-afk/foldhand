"use client";

import { useState, type ReactNode } from "react";
import { Download, Plus } from "lucide-react";
import { Button, Chip, IconButton } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Alert, Modal, Progress } from "@/components/ui/feedback";
import { Checkbox, PositionGrid, Segmented, TextField, type Position } from "@/components/ui/fields";
import { FileTile } from "@/components/ui/file-tile";
import { Footer, TopNav } from "@/components/ui/shell";
import { ToolCard } from "@/components/ui/tool-card";
import { CATEGORIES, TOOLS } from "@/lib/tools";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border py-8">
      <h2 className="text-lg">{title}</h2>
      {children}
    </section>
  );
}

const SWATCHES = ["bg", "surface", "surface-hover", "border", "border-input", "text", "text-muted", "accent", "accent-hover", "accent-soft", "ink", "danger", "success", "warning", "page-well"];

/** Fake page content for the tiles: grey lines standing in for text. */
function Lines() {
  return (
    <span className="flex w-3/4 flex-col gap-1.5">
      {[100, 80, 92, 60].map((w, i) => <span key={i} className="h-1 rounded-pill bg-border" style={{ width: `${w}%` }} />)}
    </span>
  );
}

/** The design system check: every primitive, in every state, on one page. Not linked from the app. */
export default function DesignPage() {
  const [category, setCategory] = useState<string>("all");
  const [level, setLevel] = useState<"extreme" | "recommended" | "less">("recommended");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [position, setPosition] = useState<Position>({ vertical: "bottom", horizontal: "center" });
  const [oneFile, setOneFile] = useState(true);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [modal, setModal] = useState(false);
  const [dropped, setDropped] = useState<string | null>(null);

  return (
    <>
      <TopNav current="merge" />
      <main className="mx-auto w-full max-w-page flex-1 px-4 pb-16 md:px-6">
        <h1 className="py-8 text-xl md:text-display">Design system</h1>

        <Section title="Colour roles">
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {SWATCHES.map((name) => (
              <li key={name} className="flex flex-col gap-1 text-xs font-normal text-text-muted">
                <span className="h-12 rounded-md border border-border" style={{ background: `var(--t-color-${name})` }} />
                {name}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Type">
          <p className="text-display">Display 40</p>
          <p className="text-2xl">Tool title 32</p>
          <p className="text-xl">Heading 28</p>
          <p className="text-lg">Card title 20</p>
          <p className="text-md text-text-muted">Pitch line 18, muted</p>
          <p className="text-base">Body 16</p>
          <p className="text-sm text-text-muted">Small 14, muted</p>
          <p className="text-xs uppercase tracking-[.02em]">Nav label 12</p>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="ink">Ink</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button size="sm" variant="outline">Small</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" icon={<Download aria-hidden className="size-6" />}>Download</Button>
            <IconButton label="Add more files" variant="solid"><Plus aria-hidden className="size-5" /></IconButton>
            <IconButton label="Add" variant="outline"><Plus aria-hidden className="size-5" /></IconButton>
            <IconButton label="Add" size="sm"><Plus aria-hidden className="size-4" /></IconButton>
          </div>
        </Section>

        <Section title="Filter chips">
          <div className="flex flex-wrap gap-2">
            <Chip selected={category === "all"} onClick={() => setCategory("all")}>All</Chip>
            {CATEGORIES.map((c) => <Chip key={c.id} selected={category === c.id} onClick={() => setCategory(c.id)}>{c.label}</Chip>)}
          </div>
        </Section>

        <Section title="Tool cards">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {TOOLS.filter((t) => category === "all" || t.category === category).map((t) => <ToolCard key={t.slug} tool={t} />)}
          </div>
          <div className="flex flex-wrap gap-2">
            {TOOLS.slice(1, 4).map((t) => <ToolCard key={t.slug} tool={t} compact />)}
          </div>
        </Section>

        <Section title="Dropzone">
          <Dropzone
            title="Merge PDFs"
            pitch="Join several PDFs into one file, in the order you choose."
            buttonLabel="Choose PDF files"
            accept="application/pdf"
            acceptLabel="PDF files"
            multiple
            onFiles={(files) => setDropped(`${files.length} file${files.length === 1 ? "" : "s"} chosen`)}
          />
          {dropped && <Alert tone="success">{dropped}</Alert>}
        </Section>

        <Section title="File tiles">
          <ul className="flex flex-wrap gap-4">
            <FileTile name="Invoice March.pdf" meta="2 pages · 180 KB" preview={<Lines />} rotation={rotation} onRemove={() => {}} onRotate={() => setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270)} />
            <FileTile name="Reading.pdf" status="reading" />
            <FileTile name="Payslip.pdf" status="locked" preview={<Lines />} onRemove={() => {}} />
            <FileTile name="Broken scan.pdf" status="error" problem="File is damaged" onRemove={() => {}} />
            <FileTile name="Page 3" meta="Page 3" preview={<Lines />} selected />
            <FileTile name="Contract.pdf" meta="12 pages · 1.4 MB" preview={<Lines />} dragging />
          </ul>
        </Section>

        <Section title="Options">
          <div className="grid max-w-[340px] gap-6">
            <Segmented
              label="How much to shrink"
              value={level}
              onChange={setLevel}
              options={[
                { value: "extreme", label: "Smallest", description: "Lower picture quality" },
                { value: "recommended", label: "Balanced", description: "Good quality, good saving" },
                { value: "less", label: "Light", description: "Best quality, small saving" },
              ]}
            />
            <Segmented label="Page direction" value={orientation} onChange={setOrientation} options={[{ value: "portrait", label: "Upright" }, { value: "landscape", label: "Sideways" }]} />
            <PositionGrid label="Where on the page" value={position} onChange={setPosition} />
            <TextField label="Pages to keep" placeholder="1-3, 5" hint="This file has 8 pages" />
            <TextField label="Pages to keep" defaultValue="1-12" error="This file has 8 pages. Use numbers from 1 to 8." />
            <TextField label="Password" type="password" defaultValue="secret" />
            <Checkbox label="Put all images in one PDF" checked={oneFile} onChange={setOneFile} />
          </div>
        </Section>

        <Section title="Feedback">
          <div className="grid max-w-[560px] gap-4">
            <Progress label="Reading files" />
            <Progress label="Merging · 3 of 5 files" value={0.6} />
            <Progress label="Done" value={1} state="done" />
            <Progress label="Stopped" value={0.35} state="failed" />
            <Alert>Add at least two files to merge.</Alert>
            <Alert tone="success">Your PDF is ready.</Alert>
            <Alert tone="warning">One file was signed. The signature will not survive the change.</Alert>
            <Alert tone="danger" action={<Button size="sm" variant="outline">Try again</Button>}>This file is damaged and could not be opened.</Alert>
            <div><Button variant="outline" onClick={() => setModal(true)}>Open password prompt</Button></div>
          </div>
          <Modal open={modal} onOpenChange={setModal} title="This file is locked" description="Type the password for Payslip.pdf to open it.">
            <TextField label="Password" type="password" autoFocus />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModal(false)}>Skip this file</Button>
              <Button onClick={() => setModal(false)}>Open file</Button>
            </div>
          </Modal>
        </Section>
      </main>
      <Footer />
    </>
  );
}
