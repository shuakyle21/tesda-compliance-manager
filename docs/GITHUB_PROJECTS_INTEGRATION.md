# GitHub Projects Integration Guide

## Current Local Status

This folder is a local Git repository with no commits and no GitHub remote configured yet. The GitHub CLI is installed, but its saved token is invalid, so project creation and issue creation cannot be automated until GitHub authentication is fixed.

Required before automation:

```bash
gh auth login -h github.com
git remote add origin https://github.com/<owner>/<repo>.git
```

## Why Use GitHub Projects

GitHub Projects is suitable for this MVP because it can track issues and pull requests in table, board, and roadmap views, supports custom fields, and syncs issue/PR metadata with the project. GitHub’s documentation describes Projects as an adaptable table, board, and roadmap that integrates with issues and pull requests.

Reference: https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects

## Recommended Project

Project name:

```text
TESDA Compliance Manager MVP
```

Project description:

```text
MVP delivery board for the internal TESDA Document and Compliance Manager. Focus: tenant-safe access, batch lifecycle tracking, document readiness, trainer updates, LAMR evidence, billing preparation, and basic import/export.
```

## Recommended Custom Fields

| Field | Type | Values |
|---|---|---|
| Status | Single select | Backlog, Ready, In Progress, In Review, Done, Blocked |
| MVP Area | Single select | Auth & Tenant, Dashboard, Batch Lifecycle, Documents, Trainer, LAMR, Billing Prep, Import/Export, Security |
| Priority | Single select | P0, P1, P2 |
| Role | Single select | Admin, Coordinator, Trainer, Viewer, System |
| Effort | Single select | S, M, L |
| Target | Single select | MVP, Later |

## Recommended Views

1. **MVP Board**
   - Layout: Board
   - Group by: Status
   - Filter: `Target:MVP`

2. **By Area**
   - Layout: Table
   - Group by: MVP Area
   - Sort by: Priority

3. **Role Impact**
   - Layout: Table
   - Group by: Role

4. **Later Backlog**
   - Layout: Table
   - Filter: `Target:Later`

## Integration Workflow

1. Create the GitHub repository.
2. Push this local workspace to GitHub.
3. Create the GitHub Project.
4. Add the custom fields above.
5. Create issues from `docs/GITHUB_PROJECT_BACKLOG.md`.
6. Add issues to the Project.
7. Set `MVP Area`, `Priority`, `Role`, `Effort`, and `Target` for each issue.
8. Use pull requests to close linked issues.

## Suggested CLI Flow After Authentication

```bash
gh auth login -h github.com
gh repo create <owner-or-user>/tesda-compliance-manager --private --source=. --remote=origin --push
gh project create --owner <owner-or-user> --title "TESDA Compliance Manager MVP"
```

Then create issues manually from `docs/GITHUB_PROJECT_BACKLOG.md`, or automate issue creation once the repo owner/name and project number are known.

## Notes

- Keep the PRD in the repository as `docs/MVP_PRD.md`.
- Use GitHub issues for implementation tasks.
- Use GitHub Project fields for planning metadata.
- Do not model future features as MVP issues unless they are needed to ship first.

