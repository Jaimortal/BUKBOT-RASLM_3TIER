import os
import sys
import json

actions_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rasa", "actions")
if actions_dir not in sys.path:
    sys.path.insert(0, actions_dir)

from main_router import MainRouterService

def run_tests():
    main_router = MainRouterService()
    knowledge_router = main_router.knowledge_router
    data_loader = main_router.data_loader

    # Verify that gate_pass_process is registered
    topic_data = data_loader.get_entry("gate_pass_process")
    assert topic_data is not None, "gate_pass_process not found in data_loader!"
    
    print("=== 1. VERIFYING TOPIC DATA ===")
    print("Intent:", topic_data.get("intent"))
    print("Display Name:", topic_data.get("display_name"))
    answer = topic_data.get("responses", {}).get("answer", {})
    map_data = topic_data.get("responses", {}).get("mapData", {})
    print("EN Response:", answer.get("en"))
    print("CEB Response:", answer.get("ceb"))
    print("MapData:", json.dumps(map_data, indent=2))

    # Verify pins & routes contain CAO-ADMIN
    pins = map_data.get("pins", [])
    pin_names = [p.get("name") for p in pins]
    assert "CAO-ADMIN" in pin_names, f"CAO-ADMIN missing from pins: {pin_names}"
    assert "Start From Here" in pin_names, f"Start From Here missing from pins: {pin_names}"
    
    routes = map_data.get("routes", [])
    assert len(routes) > 0, "Routes missing from gate_pass_process mapData!"
    assert "CAO-ADMIN" in routes[0].get("name", ""), "Route name does not match CAO-ADMIN!"

    # Test test cases
    test_cases = [
        # Gate pass process queries (New data)
        ("how to get gate pass", "gate_pass_process", "User query 1"),
        ("process of getting gate pass", "gate_pass_process", "User query 2"),
        ("tell me where do i get some gate pass", "gate_pass_process", "User query 3"),
        ("aha ta maka kuhag gate pass", "gate_pass_process", "User query 4 (Cebuano)"),
        ("asa mana makuha si gate pass", "gate_pass_process", "User query 5 (Cebuano)"),
        ("gate pass acquiring process", "gate_pass_process", "User query 6"),
        ("step by step process for get pass acquirment", "gate_pass_process", "User query 7"),
        ("how do i apply for gate pass", "gate_pass_process", "Process variation 1"),
        ("where can i get gate pass", "gate_pass_process", "Process variation 2"),
        ("unsaon pagkuha og gate pass", "gate_pass_process", "Process variation 3 (Cebuano)"),
        ("step by step process for gate pass acquisition", "gate_pass_process", "Process variation 4"),
        ("where to get vehicle gate pass", "gate_pass_process", "Process variation 5"),
        ("how to get gatepass", "gate_pass_process", "Process variation 6"),
        ("how do people can get that gate pass", "gate_pass_process", "User exact reported query"),
        ("how can people get gate pass", "gate_pass_process", "Process variation 7"),

        # Gate pass policy queries (General policy)
        ("is gate pass needed to enter buksu", "general_gate_pass", "Policy check 1"),
        ("do vehicles need gate pass", "general_gate_pass", "Policy check 2"),
        ("gate pass policy in buksu", "general_gate_pass", "Policy check 3"),
        ("kinahanglan ba og gate pass", "general_gate_pass", "Policy check 4 (Cebuano)"),
        ("who needs a gate pass", "general_gate_pass", "Policy check 5"),
        ("do i need gate pass for car", "general_gate_pass", "Policy check 6"),
        ("do i need gate pass for motorcycle", "general_gate_pass", "Policy check 7"),

        # Bike gate pass queries (Bike policy)
        ("do bikes need gate pass", "bike_gate_pass", "Bike check 1"),
        ("is gate pass required for bicycles", "bike_gate_pass", "Bike check 2"),
        ("kinahanglang bag gate pass ang bike", "bike_gate_pass", "Bike check 3 (Cebuano)"),
        ("bicycle gate pass buksu", "bike_gate_pass", "Bike check 4"),
    ]

    print("\n=== 2. RUNNING ROUTING TESTS ===")
    passed = 0
    failed = 0

    for query, expected_intent, desc in test_cases:
        res, slots = main_router.route_with_context(
            intent="ask_student_service_procedures",
            latest_message={"text": query},
            user_message=query,
            slots={}
        )
        matched_intent = main_router.knowledge_router.last_selected_intent
        
        response_text = ""
        has_map = False
        if isinstance(res, dict):
            response_text = res.get("text", "")
            has_map = "mapData" in res or "mapData" in res.get("custom", {})
        elif isinstance(res, list):
            for item in res:
                if isinstance(item, dict):
                    if "text" in item:
                        response_text += item["text"] + " "
                    if "mapData" in item or "mapData" in item.get("custom", {}):
                        has_map = True
        else:
            response_text = str(res)

        status = "PASS" if matched_intent == expected_intent else "FAIL"
        if matched_intent == expected_intent:
            passed += 1
        else:
            failed += 1
            
        print(f"[{status}] Query: '{query}' ({desc})")
        print(f"        Expected: {expected_intent} | Got: {matched_intent}")
        if expected_intent == "gate_pass_process":
            print(f"        Has Map: {has_map} | Response preview: {response_text[:90]}...")

    print(f"\nResults: {passed}/{len(test_cases)} passed ({passed/len(test_cases)*100:.1f}%)")
    assert failed == 0, f"{failed} test cases failed!"

if __name__ == "__main__":
    run_tests()
