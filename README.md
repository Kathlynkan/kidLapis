# Kids Lapis

IS216 Web Application Development II, Group Project

Kids Lapis is a web app for a student care centre, with a different view for coordinators, volunteers, parents and children.

- Coordinators manage the children and volunteers, match volunteers to children based on their skills, set the weekly schedule, and see alerts for children who need attention.
- Volunteers see their schedule, record each session (learning, scores, mood and social notes such as meals and activities), and assign homework.
- Parents see how their child is doing through progress charts, the sessions and social notes, and an AI weekly summary. They can also message the coordinator.
- Children complete homework as quests, earn stars and badges, and see a leaderboard.

The app uses Gemini to turn the session notes into a handover note for the next volunteer and a weekly update for parents.

Live app: https://kidlapis-2.onrender.com

Git repo: https://github.com/Kathlynkan/kidLapis

The live app is on Render's free plan, so the server goes to sleep when it is not used. The first log in may take up to a minute.

## Accounts

All accounts use the password `password123`.

| Role | Email | Name |
|---|---|---|
| Coordinator | coordinator@kidslapis.sg | Tan Mei Ling |
| Volunteer | volunteer@kidslapis.sg | Aisha Rahman |
| Volunteer | volunteer2@kidslapis.sg | Daniel Lim |
| Volunteer | volunteer3@kidslapis.sg | Priya Nair |
| Parent | parent@kidslapis.sg | Ms Grace Wong (Ethan and Mia) |
| Parent | parent2@kidslapis.sg | Ravi Kumar (Meera and Arjun) |
| Parent | parent3@kidslapis.sg | Linda Lee (Chloe) |
| Parent | parent4@kidslapis.sg | Marcus Ong (Ryan and Sofia) |
| Child | child@kidslapis.sg | Ethan |
| Child | child2@kidslapis.sg | Meera |

To sign up as a new parent, you need the child's 6-character child code (letters and numbers). The coordinator can find it on the Manage Children page.

## Setting up

You need:
- Node.js 22.12 or newer
- pnpm (`npm install -g pnpm`)
- A MongoDB Atlas connection string. You can create a free cluster at https://cloud.mongodb.com, add a database user, allow access from anywhere (0.0.0.0/0) under Network Access, then copy the connection string from Connect > Drivers.
- A Gemini API key from https://aistudio.google.com/apikey. This is needed for the AI summaries, which are a main part of the app. If the key is missing or Gemini is not available, the app shows a simpler backup summary made from the last session instead.

1. Clone the repo (or unzip the submitted folder):
   ```
   git clone https://github.com/Kathlynkan/kidLapis.git
   cd kidLapis
   ```

2. Install the packages for the server and the client:
   ```
   cd server
   pnpm install
   cd ../client
   pnpm install
   ```

3. Create a file called `config.env` in the `server` folder. It is not in the repo because it has passwords in it.
   ```
   DB=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kidslapis?retryWrites=true&w=majority
   GEMINI_API_KEY=<your Gemini API key>
   ```
   Fill in your own connection string and Gemini key. `kidslapis` after `.net/` is the database name, and MongoDB creates it when you seed.

4. Load the demo data:
   ```
   cd server
   pnpm seed
   ```
   You can run this again any time to reset the data. Note that it deletes everything in the database first.

   The seed shifts the dates so the data always looks recent. The dates move forward on Fridays, so if you seed from Monday to Thursday, the latest sessions are from the week before.

## Running the app

Open two terminals.

Terminal 1 (server, http://localhost:8000):
```
cd server
pnpm dev
```

Terminal 2 (website, http://localhost:5173):
```
cd client
pnpm dev
```

Then go to http://localhost:5173 and log in with one of the accounts above.

## Testing

### Unit and component tests (Vitest)

These don't need the database or the servers.

```
cd client
pnpm exec vitest run
```
```
cd server
pnpm exec vitest run
```

The first line is only needed the first time. Playwright starts the server and the website by itself. Each test runs twice, once on a desktop screen and once on an iPhone 6 sized screen.

To run one file:
```
pnpm exec playwright test e2e/volunteer-handover.spec.js
```

### Test files

Each of us wrote our own tests: 1 unit test, 2 component tests and 2 E2E tests.

**Yuqi**
- Unit: `server/tests/handover.test.js` checks `checkMood`, the mood note for volunteers based on the last 3 sessions
- Component: `client/src/__tests__/volunteer/HandoverCard.spec.js` checks the summary card for volunteers and parents, including the week buttons
- Component: `client/src/__tests__/volunteer/ChildCard.spec.js` checks a child's card on the volunteer home page
- E2E: `client/e2e/volunteer-handover.spec.js` checks that a volunteer can search for a child and read the handover notes
- E2E: `client/e2e/coordinator-overview.spec.js` checks that a coordinator sees a child's overview, without the handover or edit buttons

**Jachin**
- Unit: `client/src/__tests__/child/gamification.spec.js` checks the badge and level rules
- Component: `client/src/__tests__/volunteer/HomeworkQuestCard.spec.js` checks the quest card buttons for children and volunteers
- Component: `client/src/__tests__/child/ChildAvatar.spec.js` checks the child's avatar (photo, emoji or empty)
- E2E: `client/e2e/child.spec.js` checks that a child can submit a quest and a volunteer can verify it
- E2E: `client/e2e/leaderboard.spec.js` checks the leaderboard order, the "You" label and the link back home

**Kai Sen**
- Unit: `client/src/__tests__/shared/validation.spec.js` checks `isValidChildCode`, the 6-character code a parent uses to link to their child
- Component: `client/src/__tests__/shared/LoginView.spec.js` checks the Show / Hide password button and the link to sign up
- Component: `client/src/__tests__/shared/SignupView.spec.js` checks that the form changes with the role (skills for volunteers, child code for parents) and shows errors when empty
- E2E: `client/e2e/auth.spec.js` checks that a wrong password shows an error
- E2E: `client/e2e/auth.spec.js` checks that a parent who opens `/coordinator` is sent back to their own page

**Kathlyn**
- Unit: `client/src/__tests__/parent/parentHelpers.spec.js` checks the parent page can always display what the child did at the student care
- Component: `client/src/__tests__/parent/ParentSocialDay.spec.js` checks that the parent sees what the volunteer recorded
- Component: `client/src/__tests__/parent/ChatThread.spec.js` checks the chat bubbles in Messages are displayed correctly 
- E2E: `client/e2e/messages.spec.js` checks that the bell notifies messages sent between parent and coordinator and that each child has a separate chat 
- E2E: `client/e2e/parent-viewed.spec.js` checks that one the parent views the page, the volunteer is unable to edit the session 

**Ning Xuan**
- Unit: `client/src/__tests__/volunteer/homeworkValidation.spec.js` checks that homework can only be assigned with valid due dates and rejects invalid inputs.
- Component: `client/src/__tests__/volunteer/HomeworkQuestCard.spec.js` checks that the correct volunteer actions are displayed based on the homework status.
- Component: `client/src/__tests__/volunteer/SessionCard.spec.js` checks that session editing controls are displayed correctly according to volunteer permissions and whether the session has been viewed by a parent.
- E2E: `client/e2e/nx/assignHomework.spec.js` checks that volunteers can assign homework successfully and that homework validation rules are enforced.
- E2E: `client/e2e/nx/assignmentRequests.spec.js` checks that volunteers can accept or decline assignment requests and that completed requests remain visible in the request history after a page refresh.

**Yu Xuan**
- Unit: server/tests/matchmaking.test.js checks the child being matched doesn't count towards workload
- Component: client/src/components/__tests__/WeekdayDots.spec.js checks five red days and 0/5 with no sessions
- Component: client/src/components/__tests__/MiniAvatar.spec.js checks it shows a photo when the avatar is a file path, the emoji when it's an emoji, the first letter of the name when there is no avatar, and that it uses the size it is given
- E2E: client/e2e/coordinator.spec.js checks Children, Volunteer, and Sessions week tiles appear
- E2E: client/e2e/schedule.spec.js checks that volunteer booking logic works, all volunteers appear, can't overbook, and pending requests

## Folders

```
kidLapis/
  server/          Express API
    routes/        one file per feature
    models/        Mongoose schemas
    data/          demo data (seed.json)
    tests/         server tests
  client/          Vue app
    e2e/           Playwright tests
    src/views/     pages, one folder per role
    src/components/  reusable components
    src/__tests__/   unit and component tests
```
