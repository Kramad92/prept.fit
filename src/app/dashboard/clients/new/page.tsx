"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useT } from "@/lib/i18n";

const clientFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  phone: z.string().max(50).optional(),
  gender: z.string().optional(),
  height: z.string().optional(),
  goals: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  allergies: z.string().max(1000).optional(),
  dietaryPrefs: z.string().max(1000).optional(),
  injuries: z.string().max(1000).optional(),
  fitnessLevel: z.string().optional(),
  activityLevel: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function NewClientPage() {
  const t = useT();
  const router = useRouter();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      gender: "",
      height: "",
      goals: "",
      notes: "",
      allergies: "",
      dietaryPrefs: "",
      injuries: "",
      fitnessLevel: "",
      activityLevel: "",
    },
  });

  async function onSubmit(data: ClientFormValues) {
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const client = await res.json();
        router.push(`/dashboard/clients/${client.id}`);
      }
    } catch {
      // handled by API
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.clients.backToClients}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {t.clients.addClient}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="card max-w-lg space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.clientName} *</FormLabel>
                <FormControl>
                  <Input placeholder={t.clients.clientName} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.common.email}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.common.phone}</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 (555) 000-0000" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.gender}</FormLabel>
                <FilterSelect
                  value={field.value || ""}
                  onChange={field.onChange}
                  placeholder={t.photos.selectCategory}
                  options={[
                    { value: "male", label: t.clients.male },
                    { value: "female", label: t.clients.female },
                    { value: "other", label: t.clients.other },
                  ]}
                />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.height} (cm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder={t.clients.heightPlaceholder} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="goals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.goals}</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder={t.clients.goalsPlaceholder} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fitnessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.clients.fitnessLevel}</FormLabel>
                  <FilterSelect
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t.clients.selectLevel}
                    options={[
                      { value: "beginner", label: t.clients.beginner },
                      { value: "intermediate", label: t.clients.intermediate },
                      { value: "advanced", label: t.clients.advanced },
                    ]}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="activityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.clients.activityLevel}</FormLabel>
                  <FilterSelect
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t.clients.selectLevel}
                    options={[
                      { value: "sedentary", label: t.clients.sedentary },
                      { value: "light", label: t.clients.lightActivity },
                      { value: "moderate", label: t.clients.moderateActivity },
                      { value: "active", label: t.clients.activeLevel },
                      { value: "very_active", label: t.clients.veryActive },
                    ]}
                  />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.allergies}</FormLabel>
                <FormControl>
                  <Input placeholder={t.clients.allergiesPlaceholder} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dietaryPrefs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.dietaryPrefs}</FormLabel>
                <FormControl>
                  <Input placeholder={t.clients.dietaryPrefsPlaceholder} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="injuries"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.clients.injuries}</FormLabel>
                <FormControl>
                  <Input placeholder={t.clients.injuriesPlaceholder} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t.common.notes}</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder={t.clients.notesPlaceholder} {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
              {form.formState.isSubmitting ? t.common.saving : t.clients.addClient}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/clients">
                {t.common.cancel}
              </Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
