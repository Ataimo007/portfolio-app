#!/usr/bin/env bash
set -euo pipefail
CLOUD="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$CLOUD/.local/bin"
chmod 700 "$CLOUD/.local"
python3 - "$CLOUD/.local/bin" <<'PY'
import hashlib, io, platform, sys, urllib.request, zipfile
from pathlib import Path
system = {'Linux': 'linux', 'Darwin': 'darwin'}[platform.system()]
arch = {'aarch64': 'arm64', 'arm64': 'arm64', 'x86_64': 'amd64'}[platform.machine()]
name = f'terraform_1.14.6_{system}_{arch}.zip'
base = 'https://releases.hashicorp.com/terraform/1.14.6/'
checks = urllib.request.urlopen(base + 'terraform_1.14.6_SHA256SUMS', timeout=60).read().decode()
expected = next(line.split()[0] for line in checks.splitlines() if line.split()[-1] == name)
data = urllib.request.urlopen(base + name, timeout=120).read()
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('Terraform checksum mismatch')
with zipfile.ZipFile(io.BytesIO(data)) as archive:
    target = Path(sys.argv[1]) / 'terraform'
    staging = target.with_suffix('.download')
    staging.write_bytes(archive.read('terraform')); staging.chmod(0o755)
    staging.replace(target)
name = f'https://dl.k8s.io/release/v1.35.9/bin/{system}/{arch}/kubectl'
expected = urllib.request.urlopen(name + '.sha256', timeout=60).read().decode().strip()
data = urllib.request.urlopen(name, timeout=120).read()
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('kubectl checksum mismatch')
target = Path(sys.argv[1]) / 'kubectl'
staging = target.with_suffix('.download')
staging.write_bytes(data); staging.chmod(0o755)
staging.replace(target)
PY
python3 -m venv "$CLOUD/.local/venv"
"$CLOUD/.local/venv/bin/pip" install 'ansible-core>=2.19,<2.21' PyYAML
"$CLOUD/.local/venv/bin/ansible-galaxy" collection install -p "$CLOUD/.local/collections" -r "$CLOUD/ansible/requirements.yml"
echo 'Project-local Terraform and Ansible installed. Azure CLI, SSH, kubectl and Helm must be available on the controller.'
