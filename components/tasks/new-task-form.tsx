"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Shield } from "lucide-react";

type SourceOption = {
  id: string;
  label: string;
  helper?: string;
  disabled?: boolean;
};

const sourceOptions: SourceOption[] = [
  {
    id: "yellow_pages",
    label: "Yellow Pages (US)",
    helper: "Directorio comercial en EEUU con telefonos y direcciones.",
  },
  {
    id: "google",
    label: "Google Maps",
    helper: "Incluye telefonos y websites de Maps",
  },
  { id: "yelp", label: "Yelp", helper: "Reviews y datos locales" },
  {
    id: "google_local_services",
    label: "Google Local Services",
    helper: "Proveedores verificados por Google (plomeros, electricistas, abogados, etc.)",
  },
  {
    id: "google_jobs",
    label: "Google Jobs",
    helper: "Empresas que están contratando - indica negocios activos/en crecimiento",
  },
  {
    id: "manta",
    label: "Manta",
    helper: "Datos B2B y dueños (próximamente)",
    disabled: true,
  },
  {
    id: "paus",
    label: "Páginas Amarillas US (ES)",
    helper: "Versión en español enfocada a negocios latinos (próximamente).",
    disabled: true,
  },
  {
    id: "facebook_places",
    label: "Facebook Places",
    helper: "Negocios locales pequeños; suele tener WhatsApp/telefono (próximamente).",
    disabled: true,
  },
  {
    id: "bing_places",
    label: "Bing Places",
    helper: "Cobertura alternativa a Google con telefonos y direcciones (no soportado en SerpApi actual).",
    disabled: true,
  },
];

export function NewTaskForm() {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");
  const [sources, setSources] = useState<string[]>(["yellow_pages"]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const states = useMemo(
    () => [
      {
        code: "CA",
        name: "California",
        cities: [
          "Los Angeles",
          "San Diego",
          "San Jose",
          "San Francisco",
          "Fresno",
          "Sacramento",
          "Riverside",
          "Bakersfield",
        ],
      },
      {
        code: "TX",
        name: "Texas",
        cities: [
          "Houston",
          "San Antonio",
          "Dallas",
          "Austin",
          "Fort Worth",
          "El Paso",
          "McAllen",
          "Brownsville",
          "Laredo",
        ],
      },
      {
        code: "FL",
        name: "Florida",
        cities: ["Miami", "Orlando", "Tampa", "Jacksonville"],
      },
      {
        code: "NY",
        name: "New York",
        cities: ["New York", "Buffalo", "Rochester", "Albany"],
      },
      {
        code: "NJ",
        name: "New Jersey",
        cities: ["Newark", "Jersey City", "Paterson"],
      },
      {
        code: "IL",
        name: "Illinois",
        cities: ["Chicago", "Aurora", "Naperville"],
      },
      {
        code: "AZ",
        name: "Arizona",
        cities: ["Phoenix", "Tucson"],
      },
      {
        code: "NM",
        name: "New Mexico",
        cities: ["Albuquerque"],
      },
      {
        code: "NV",
        name: "Nevada",
        cities: ["Las Vegas"],
      },
      {
        code: "CO",
        name: "Colorado",
        cities: ["Denver"],
      },
      {
        code: "GA",
        name: "Georgia",
        cities: ["Atlanta"],
      },
      {
        code: "NC",
        name: "North Carolina",
        cities: ["Charlotte", "Raleigh"],
      },
      {
        code: "WA",
        name: "Washington",
        cities: ["Seattle"],
      },
      {
        code: "OR",
        name: "Oregon",
        cities: ["Portland"],
      },
      {
        code: "MA",
        name: "Massachusetts",
        cities: ["Boston"],
      },
      {
        code: "PA",
        name: "Pennsylvania",
        cities: ["Philadelphia"],
      },
      {
        code: "DC",
        name: "District of Columbia",
        cities: ["Washington"],
      },
    ],
    [],
  );

  const availableCities = useMemo(() => {
    return states.find((state) => state.code === stateCode)?.cities ?? [];
  }, [stateCode, states]);

  useEffect(() => {
    if (city && stateCode) {
      setLocation(`${city}, ${stateCode}`);
    } else {
      setLocation("");
    }
  }, [city, stateCode]);

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    if (!keyword.trim()) {
      setError("Ingresa una palabra clave.");
      setSubmitting(false);
      return;
    }

    if (!location.trim()) {
      setError("Selecciona estado y ciudad de Estados Unidos.");
      setSubmitting(false);
      return;
    }

    try {
      const selectedSources = sources.length ? sources : ["yellow_pages"];

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          location,
          sources: selectedSources,
          notes,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error ?? "No se pudo crear la tarea");
      }

      const leadsCount = result?.yellowPages?.leads?.length ?? 0;
      setMessage(
        result?.message ??
          `Tarea lista. Yellow Pages devolvio ${leadsCount} leads y se guardo en Supabase.`,
      );

      if (result?.supabase) {
        const warnings = Object.values(result.supabase).filter(Boolean);
        if (warnings.length > 0) {
          setError(`Supabase aviso: ${warnings.join(" / ")}`);
        }
      }

      // Mantener en pantalla para lanzar mas tareas en serie.
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Ocurrio un error al crear la tarea",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-black/40">
          <CardHeader>
            <CardTitle className="text-white">Criterios de busqueda</CardTitle>
            <p className="text-sm text-muted-foreground">
              Define el nicho y la ubicacion. La tarea se envia a la cola
              asincrona con rotacion de user agents.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="keyword">Palabra clave / Nicho</Label>
                <Input
                  id="keyword"
                  placeholder="Ej. Pizzerias"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={stateCode} onValueChange={setStateCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado (US)" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Ciudad</Label>
                <Select
                  value={city}
                  onValueChange={setCity}
                  disabled={!stateCode}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        stateCode ? "Selecciona ciudad" : "Primero el estado"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((cityName) => (
                      <SelectItem key={cityName} value={cityName}>
                        {cityName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Destino (auto)</Label>
                <Input
                  id="location"
                  value={location}
                  readOnly
                  placeholder="Selecciona estado y ciudad"
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
                  <SelectItem value="zip">Codigo Postal</SelectItem>
                  <SelectItem value="radius">Radio (km)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ajusta alcance del scraper. Configurable via servicio de Python.
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
              Telefono, Website, Direccion y Contacto.
            </p>
            <p className="text-xs text-muted-foreground">
              Yellow Pages (US) ya esta conectada a Supabase; el resto se puede
              activar fuente por fuente.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border border-border/60 p-3 transition",
                  option.disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:border-border hover:bg-white/[0.03]",
                  sources.includes(option.id) &&
                    "border-emerald-500/60 bg-emerald-500/5",
                )}
              >
                <Checkbox
                  checked={sources.includes(option.id)}
                  onCheckedChange={() => {
                    if (option.disabled) return;
                    toggleSource(option.id);
                  }}
                  disabled={option.disabled}
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
                Pipeline protegido: tareas corren en background con Supabase.
              </div>
              <p className="mt-1 text-xs">
                Al finalizar, recibiras notificacion y podras explorar en la
                tabla avanzada o exportar CSV/CRM.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-black/40 px-4 py-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Ejecucion asincrona</p>
          <p className="text-xs text-muted-foreground">
            Puedes cerrar la ventana; la cola seguira procesando.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {error ? (
            <Badge variant="destructive" className="text-xs">
              {error}
            </Badge>
          ) : null}
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
