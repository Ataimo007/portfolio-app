# Public repository rights and activity

Original work is source-visible with reserved rights under LICENSE, with
COPYRIGHT.md and PATENTS.md explaining ownership and patent status. This is not
an open-source license. GitHub public-repository rights still allow viewing and
forking; these files cannot prevent downloading or copying technically.

View repository Insights → Traffic for aggregate visitors and full clones over
the previous 14 days. Git fetch and ordinary git pull operations are not listed
as clone events. Individual cloner identities are not available.

Authenticated read-only checks:

```sh
gh api repos/Ataimo007/portfolio-app/traffic/clones
gh api repos/Ataimo007/portfolio-app/traffic/views
gh api repos/Ataimo007/portfolio-app/forks --paginate
gh pr list --repo Ataimo007/portfolio-app --state all
```

Pull requests are separate from git pull operations. Export traffic regularly
if history beyond 14 days is needed; do not sum daily unique counts and present
them as unique people across the whole period.

2026-10-08: GitHub reported zero forks and zero clones in the available window.

CPU check at 07:02 UTC: node usage 226 millicores (11% of two vCPUs), memory
6747 MiB (42%). Largest pod CPU samples: mail Redis 28m, portfolio worker 25m,
Grafana 19m, Prometheus 10m. SSH confirmed x86_64 AMD EPYC 7763, two logical CPUs.
No saturation was observed. The resize added memory, not CPU cores; these
samples alone cannot explain an earlier spike or establish its cause.
