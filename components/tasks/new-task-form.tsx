"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Shield } from "lucide-react";

type SourceOption = {
  id: string;
  label: string;
  helper?: string;
};

const sourceOptions: SourceOption[] = [
  {
    id: "google",
    label: "Google Business Profile",
    helper: "Incluye teléfonos y websites de Maps",
  },
  { id: "yelp", label: "Yelp", helper: "Reviews y datos locales" },
  { id: "manta", label: "Manta", helper: "Datos B2B y dueños" },
  { id: "mapquest", label: "MapQuest", helper: "Direcciones y geos" },
];

export function NewTaskForm() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [sources, setSources] = useState<string[]>(["google", "yelp"]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const payload = {
      keyword,
      location,
      sources,
      notes,
    };

    // Placeholder for queue submission. Replace with call to Next API route.
    setTimeout(() => {
      setSubmitting(false);
      setMessage("Tarea creada. Se está procesando en background.");
      router.push("/");
    }, 900);

    console.log("Task payload", payload);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-black/40">
          <CardHeader>
            <CardTitle className="text-white">Criterios de búsqueda</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define el nicho y la ubicación. La tarea se enviará a la cola
              asíncrona.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="keyword">Palabra clave / Nicho</Label>
                <Input
                  id="keyword"
                  placeholder="Ej. Pizzerías"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Ubicación (Ciudad o ZIP)</Label>
                <Input
                  id="location"
                  placeholder="Madrid, ES"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Granularidad</Label>
              <Select defaultValue="city">
                <SelectTrigger id="region">
                  <SelectValue placeholder="Selecciona nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="city">Ciudad</SelectItem>
                  <SelectItem value="zip">Código Postal</SelectItem>
                  <SelectItem value="radius">Radio (km)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ajusta alcance del scraper. Configurable vía servicio de Python.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas internas</Label>
              <Textarea
                id="notes"
                placeholder="Instrucciones opcionales para el scraper o filtros adicionales."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-gradient-to-b from-white/[0.06] via-black/40 to-black/60">
          <CardHeader>
            <CardTitle className="text-white">Fuentes a scrapear</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecciona en paralelo. Los resultados se normalizan en: Nombre,
              Teléfono, Website, Dirección y Contacto.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 p-3 transition hover:border-border hover:bg-white/[0.03]",
                  sources.includes(option.id) &&
                    "border-emerald-500/60 bg-emerald-500/5",
                )}
              >
                <Checkbox
                  checked={sources.includes(option.id)}
                  onCheckedChange={() => toggleSource(option.id)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none text-white">
                    {option.label}
                  </p>
                  {option.helper ? (
                    <p className="text-xs text-muted-foreground">
                      {option.helper}
                    </p>
                  ) : null}
                </div>
              </label>
            ))}

            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-100">
              <div className="flex items-center gap-2 text-emerald-200">
                <Shield className="h-4 w-4" />
                Pipeline protegido: tareas corren en background.
              </div>
              <p className="mt-1 text-xs">
                Al finalizar, recibirás notificación y podrás explorar en la
                tabla avanzada o exportar CSV/CRM.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-black/40 px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Ejecución asíncrona</p>
          <p className="text-xs text-muted-foreground">
            Puedes cerrar la ventana; la cola seguirá procesando.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {message ? (
            <Badge variant="outline" className="border-emerald-500/50 text-xs">
              {message}
            </Badge>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="gap-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando tarea
              </>
            ) : (
              "Lanzar scraper"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
