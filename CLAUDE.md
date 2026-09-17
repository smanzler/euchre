# Claude Instructions

## When Something Unexpected Comes Up

- Stop when the task is not what it looked like: a new constraint, a blocker, a
  failing assumption, a design decision the request does not answer, or work
  that grows past what was asked
- Do not pick a path and continue; do not silently change the scope, the
  approach, or the plan
- Say what you found in one or two lines, then ask a question or give two or
  three concrete options with a recommendation
- Keep doing the parts that the answer does not change, and report them
- Continue without asking only when the answer changes nothing

## Where Code Lives

- Group by feature, not by file type; the top level of the source tree reads as
  a list of features
- Put a file in the feature that uses it; when only one feature uses it, it does
  not belong in a shared directory
- Nest a sub-feature under its parent feature when the parent grows; keep the
  same directory names at each level
- Keep the shared directories flat, and put a file there only when two or more
  features use it
- Move a file up only when a second feature needs it; move it back down when one
  feature is left
- Keep a test beside the file that it tests
- Keep the route or entry-point files thin; put the screen and the logic in the
  feature

```
src/
  features/
    foo/{components,hooks,lib,screens}/
    bar/
      baz/hooks/
      qux/{components,hooks,screens}/
  components/   # used by two or more features
  hooks/
  lib/
```

## Branching on a Union

- Put the behaviour in a dispatch table keyed by the union value; do not chain
  ternaries or repeat a switch
- Use a ternary or a switch only for one local two-way branch that no other file
  repeats
- Define one dispatch interface, one implementation per member, and one registry
  that the call sites index
- Constrain each implementation to its own member, and keep the registry
  generic over the union
- Make the registry total, so a new member fails at type-check time, not at run
  time
- Add a member by adding one implementation, not by editing every call site

```ts
type Kind = "foo" | "bar";

type KindDispatch<K extends Kind = Kind> = {
  get(id: string): Promise<Item<K>>;
};

const fooDispatch: KindDispatch = { ... } satisfies KindDispatch<"foo">;
const barDispatch: KindDispatch = { ... } satisfies KindDispatch<"bar">;

const kindDispatches: Record<Kind, KindDispatch> = { foo: fooDispatch, bar: barDispatch };

const get = (kind: Kind, id: string) => kindDispatches[kind].get(id);
```

## Inline Code Comments

- Write no comment by default
- Comment only what the code cannot show: a constraint, an upstream bug, a necessary order, a unit, or a deliberate deviation
- Do not repeat the code or a name
- Do not add a banner, a divider, or a changelog
- Do not describe your change; the diff shows it
- Delete a comment when it becomes wrong or unnecessary
- Give the constraint, not the story

## Comment style:

- Write every comment in ASD-STE100 (Simplified Technical English)
- Prefer simple verbs: use, make, get, put, remove, start, stop, keep, find, send

## Writing doc blocks:

- A doc block tells the caller how to use the symbol
- Exclude why the symbol exists, what it replaced, a rejected option, a ticket, a link, and a name
- Write no doc block when the name and the signature are clear
- Do not repeat a type that the language declares
- Add a `@param` line only when the name does not give the constraint
