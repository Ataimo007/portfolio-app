from pathlib import Path
import tarfile

root = Path(__file__).resolve().parents[3]
target = root / 'infra/azure/.local/source.tar.gz'
target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
excluded = {'.git', '.next', 'node_modules', '.local', '.terraform', '.codex', '.agents', '.devcontainer', '.vscode', 'test-results', 'playwright-report', '__pycache__'}
with tarfile.open(target, 'w:gz') as archive:
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if any(part in excluded for part in rel.parts) or not path.is_file() or path.is_symlink():
            continue
        if path.name.startswith('.env') or path.name == 'terraform.tfvars' or path.suffix in {'.tfstate', '.tfplan', '.pem', '.key', '.p12'} or '.tfstate.' in path.name or 'kubeconfig' in path.name:
            continue
        archive.add(path, arcname=str(rel), recursive=False)
target.chmod(0o600)
print('Private source bundle created; runtime credentials and Terraform state excluded.')
