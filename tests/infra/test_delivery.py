import importlib.util
import pathlib
import unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
def load(name,file):
    spec=importlib.util.spec_from_file_location(name,ROOT/'infra/azure/ci'/file)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
prepare=load('prepare','prepare.py');plans=load('plans','check-plan.py')
class DeliveryTests(unittest.TestCase):
    def test_existing_vm_always_uses_app_only_route(self):
        for route in ['auto','brownfield','greenfield']:
            self.assertEqual(prepare.choose_route(route,['ataimo-platform'],'ataimo-platform'),'brownfield')
    def test_missing_vm_requires_explicit_fresh_deployment(self):
        for route in ['auto','brownfield']:
            with self.assertRaises(ValueError): prepare.choose_route(route,[],'ataimo-platform')
        self.assertEqual(prepare.choose_route('greenfield',[],'ataimo-platform'),'greenfield')
    def test_unexpected_vm_is_not_treated_as_empty(self):
        with self.assertRaises(ValueError): prepare.choose_route('greenfield',['another-vm'],'ataimo-platform')
    def test_plan_rejects_deletes_and_replacements(self):
        for actions in [['delete'],['delete','create'],['create','delete']]:
            with self.assertRaises(ValueError): plans.validate({'resource_changes':[{'change':{'actions':actions}}]})
        self.assertEqual(plans.validate({'resource_changes':[{'change':{'actions':['create']}}]}),1)
if __name__=='__main__': unittest.main()
