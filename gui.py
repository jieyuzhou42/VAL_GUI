from web_interface import WebInterface
import json


class HtnInterface:
    def __init__(self, file_path):
        with open(file_path, 'r') as file:
            self.knowledge_base = json.load(file)
    
    def get_decomposition(self, i):
        return self.knowledge_base[i]


user_interface = WebInterface()
user_task = user_interface.request_user_task()
htn_interface = HtnInterface("knowledge_base.json")
# VAL interpret user task
# task = ValAgent.interprete(user_task)
decomposition = htn_interface.get_decomposition(0)
i = 1
while decomposition:
    if user_interface.confirm_best_match_decomposition(decomposition):
        next_layer = []
        result = htn_interface.get_decomposition(i)
        next_layer.extend(result)
        i += 1
        decomposition = next_layer
