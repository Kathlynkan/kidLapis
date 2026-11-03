# Where the client tests go

Unit tests and component tests live here, in one folder for each role, so everybody knows where to put theirs.

| Folder | What goes in it |
|---|---|
| `parent/` | tests of the parent page, messages and the parent's components |
| `child/` | tests of the child page and the gamification rules |
| `volunteer/` | tests of the volunteer pages |
| `coordinator/` | tests of the coordinator pages |
| `shared/` | tests of things every role uses: the format helpers, the validation rules and the auth store |

- **Name:** `Something.spec.js`, next to the others in your folder.
- **Imports:** use the `@/` shortcut, for example `import { firstName } from '@/utils/format'`.
- **Run them all:** `pnpm test:unit`
- **E2E tests** (the whole app in a browser) are not here. They are in `client/e2e`.
- The tests of the server are in `server/tests`.
