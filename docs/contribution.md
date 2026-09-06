# Commit conventions

In this project we will use the conventional commits specification to make our commits more readable and understandable. The documentation for this can be found [here](https://www.conventionalcommits.org/en/v1.0.0/).

The most important rules will be listed below:

- Commits must be prefixed with a type, which consists of a noun, `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` or `revert`, followed by a colon and a space.
- The commit message must be written in all lowercase letters, with the exception of words that refer to names or code.
- The commit message must not end with a period.
- The commit message must be written in the imperative, present tense: "change" not "changed" nor "changes".
- The commit message must be written in English.
- If there has been cooperation in the commit, the commit must end with a `Co-authored-by: {name}` line.

In addition to the above rules, the commit message must have a reference to the issue number at the footer of the commit message, in this format: `#1`, where `1` is the issue number.

There can also be an optional body to the commit message, which can be used to explain the commit in more detail.

### Example commit

```
feat: add pagination component

#1

Co-authored-by: John Doe
```

---

# Issues

For every programming task, there must be an issue created in the GitHub repository. The issue must be assigned to the person who will be working on the task. The issue must have a title and a description, both in english. The title should be a short description of the task.

The description should be a more thorough explanation of the task, and should include what the issue needs to be done. The description should also include a list of acceptance criteria, which are a list of requirements that must be met for the task to be considered complete.

### Labels

The issues should be labeled with the following labels:

- `bug`: The issue is a bug that needs to be fixed.
- `docs`: The issue is a documentation task.
- `feat`: The issue is a new feature that needs to be implemented.
- `refactor`: The issue is a refactoring task.
- `frontend`: The issue is a frontend task.
- `backend`: The issue is a backend task.
- `status: backlog`: The issue is in the backlog.
- `status: selected for development`: The issue has been selected for development.
- `status: in progress`: The issue is currently being worked on.
- `status: in review`: The issue is currently being reviewed.

The `status::` prefix these labels used to carry was GitLab scoped-label syntax and
has no meaning on GitHub, where the repository now lives.

---

# Pull requests

The repository is hosted on GitHub, so a completed task becomes a pull request. This
document previously described GitLab merge requests, which was left over from the
project's original home on the NTNU GitLab instance.

When a task is complete, open a pull request and request a reviewer. The title and
description are in English; the title should be a short description of the task, and
may be the same as the commit message.

Before merging:

- **CI must be green.** [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
  runs lint, format, type check and both test suites for both packages. It is the
  same command set as `make check`, so a green local run means a green CI run.
- **Another person must review it.** The reviewer checks that the code follows the
  conventions, that it works as intended, and that the commits follow the commit
  conventions. Review comments are left as threads on the code, and the person who
  opened a thread is the one who resolves it. All threads must be resolved before
  merging.
- **Documentation must match.** README, ARCHITECTURE and the per-package READMEs
  state concrete counts and defects. If behaviour changed, the document describing
  it changes in the same pull request.

Rebase onto `main` before merging, to resolve conflicts and keep a clean history.

Merge with **Squash and merge**. Where several people worked on a branch, list them
in the merge commit as `Co-authored-by: {name}`, and keep the merge commit in the
format specified in the commit conventions above.
