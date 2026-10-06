from pathlib import Path
import re
root = Path(__file__).resolve().parents[3]
tokens = {}
for file in [root / 'app/globals.css', root / 'app/brand.css']:
    text = file.read_text()
    for block in re.findall(r'@theme(?:\s+static)?\s*\{([^}]+)\}', text):
        for name, value in re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', block):
            tokens[name] = value
output = ':root {\n' + ''.join(f'  {name}: {value};\n' for name, value in tokens.items()) + '}\n'
target = root / 'infra/local-kubernetes/charts/identity-theme/files/ataimo/login/resources/css/tokens.css'
target.write_text(output)
print('Identity theme tokens synchronized from the application theme')
