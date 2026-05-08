"use client";

import Link from "next/link";
import { CheckCircle2, UserRoundPlus } from "~/components/ui/icons";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function AddMemberPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [memberName, setMemberName] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(true);
  };

  const handleAddAnother = () => {
    setMemberName("");
    setIsSubmitted(false);
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <h1 className="font-semibold text-2xl tracking-tight">Add a family member</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Create an unclaimed profile so your family circle includes people who have not joined yet.
        </p>
      </header>

      {isSubmitted ? (
        <section className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="font-medium text-lg">Member profile created</h2>
              <p className="text-sm text-muted-foreground">
                {memberName || "This person"} was added as an unclaimed family member profile.
              </p>
              <p className="text-sm text-muted-foreground">
                They can claim this profile later using a claim invite.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={handleAddAnother}>
              Add another member
            </Button>
            <Button asChild type="button" variant="outline">
              <Link href="/members">Back to members</Link>
            </Button>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} action="#" className="rounded-3xl border bg-card p-6 shadow-sm sm:p-7">
          <div className="mb-6 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <UserRoundPlus className="mt-0.5 size-4" aria-hidden="true" />
              <p>
                This creates an unclaimed profile only. The person does not need to be present now and
                can claim the account later.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="name"
                placeholder="For example: Evelyn Walker"
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="relationship" className="text-sm font-medium">
                Relationship
              </label>
              <select
                id="relationship"
                defaultValue=""
                className="flex h-10 w-full min-w-0 rounded-2xl border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                required
              >
                <option value="" disabled>
                  Select relationship
                </option>
                <option value="Parent">Parent</option>
                <option value="Sibling">Sibling</option>
                <option value="Child">Child</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Aunt/Uncle">Aunt/Uncle</option>
                <option value="Cousin">Cousin</option>
                <option value="Family Friend">Family Friend</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email (optional)
              </label>
              <Input id="email" type="email" placeholder="name@family.com" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="photoUrl" className="text-sm font-medium">
                Photo URL (optional)
              </label>
              <Input id="photoUrl" placeholder="https://example.com/photo.jpg" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="note" className="text-sm font-medium">
                Short note (optional)
              </label>
              <textarea
                id="note"
                rows={4}
                placeholder="Any context for this profile, such as preferred name or invite timing."
                className="w-full rounded-2xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex items-start gap-2 text-sm text-muted-foreground">
                <input type="checkbox" defaultChecked className="mt-0.5" />
                <span>
                  They are not joining yet. I am only creating their profile now so they can be tagged
                  in memories and claim later.
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="submit">Create member</Button>
            <Button asChild type="button" variant="outline">
              <Link href="/members">Back to members</Link>
            </Button>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Inline note: after this profile is created, you can send a claim invite whenever they are
            ready to join.
          </p>
        </form>
      )}
    </section>
  );
}
