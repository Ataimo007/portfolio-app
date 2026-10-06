import json
import sys

def validate(plan):
    changes = plan.get('resource_changes', [])
    if any('delete' in change['change']['actions'] for change in changes):
        raise ValueError('Delete/replacement actions are forbidden in the fresh-deployment pipeline.')
    return len(changes)

if __name__ == '__main__':
    print(f'Non-destructive Terraform plan validated: {validate(json.load(open(sys.argv[1])))} resources.')
