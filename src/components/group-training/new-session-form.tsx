"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useT } from "@/lib/i18n";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/ui/filter-select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  maxParticipants: z.string(),
  isOpen: z.boolean(),
  groupId: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

interface GroupOption {
  id: string;
  name: string;
}

interface NewSessionFormProps {
  groups: GroupOption[];
  onCreated: () => void;
  onCancel: () => void;
}

export function NewSessionForm({ groups, onCreated, onCancel }: NewSessionFormProps) {
  const t = useT();
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: "",
      date: new Date().toISOString().slice(0, 10),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      notes: "",
      maxParticipants: "20",
      isOpen: false,
      groupId: "",
    },
  });

  const onSubmit = async (data: SessionFormValues) => {
    await api.post("/api/group-sessions", {
      title: data.title.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location?.trim() || null,
      notes: data.notes?.trim() || null,
      maxParticipants: parseInt(data.maxParticipants) || 20,
      isOpen: data.isOpen,
      groupId: data.groupId || null,
    });
    onCreated();
  };

  return (
    <div className="card mb-6">
      <h3 className="mb-4 text-lg font-semibold">{t.groupTraining.newSession}</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t.groupTraining.sessionTitle}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.groupTraining.sessionTitlePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.common.date}</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{t.schedule.startTime}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{t.schedule.endTime}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.groupTraining.location}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.groupTraining.locationPlaceholder} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxParticipants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.groupTraining.maxParticipants}</FormLabel>
                  <FormControl>
                    <Input type="number" className="w-32" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.groupTraining.linkedGroup}</FormLabel>
                  <FilterSelect
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder={t.groupTraining.noGroup}
                    options={groups.map((g) => ({ value: g.id, label: g.name }))}
                  />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isOpen"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isOpen"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="isOpen" className="text-sm text-gray-700">{t.groupTraining.openSession}</label>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t.common.notes}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder={t.common.notesPlaceholder} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>{t.common.create}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>{t.common.cancel}</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
