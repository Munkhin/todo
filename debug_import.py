import sys
import os
sys.path.append(os.getcwd())

with open("debug_output.txt", "w") as f:
    try:
        from api.preprocess_user_input import file_processing
        f.write("Successfully imported file_processing\n")
        f.write(str(dir(file_processing)) + "\n")
        from api.scheduling.agent_actions import utils
        f.write("Successfully imported utils\n")
    except Exception as e:
        f.write(f"Error: {e}\n")
        import traceback
        traceback.print_exc(file=f)
