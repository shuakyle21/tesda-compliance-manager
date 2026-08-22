# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual
label strings used in this repo's issue tracker (Linear).

| Label in mattpocock/skills | Label in our tracker | Meaning                                   |
| --------------------------- | --------------------- | ------------------------------------------ |
| `needs-triage`               | `needs-triage`         | Maintainer needs to evaluate this issue    |
| `needs-info`                 | `needs-info`           | Waiting on reporter for more information   |
| `ready-for-agent`            | `ready-for-agent`      | Fully specified, ready for an AFK agent    |
| `ready-for-human`            | `ready-for-human`      | Requires human implementation              |
| `wontfix`                    | `wontfix`              | Will not be actioned                       |

Applied as Linear labels via `mcp__linear-server__save_issue` (`labelIds`), independent of the
issue's workflow status. Edit the right-hand column if these labels don't yet exist in the
TESDA-CAMS Linear team — create them there first.
