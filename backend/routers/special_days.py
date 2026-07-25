from fastapi import APIRouter
from routers.important_days import (
    get_important_days as get_special_days,
    get_today_important_days as get_today_special_days,
    get_important_day_by_id as get_special_day_by_id,
    create_important_day as create_special_day,
    update_important_day as update_special_day,
    delete_important_day as delete_special_day,
    generate_wish,
    send_test_email
)

router = APIRouter(tags=["Special Days"])

router.add_api_route("", get_special_days, methods=["GET"])
router.add_api_route("/today", get_today_special_days, methods=["GET"])
router.add_api_route("/generate-wish", generate_wish, methods=["POST"])
router.add_api_route("/send-test-email", send_test_email, methods=["POST"])
router.add_api_route("/{important_day_id}", get_special_day_by_id, methods=["GET"])
router.add_api_route("", create_special_day, methods=["POST"], status_code=201)
router.add_api_route("/{important_day_id}", update_special_day, methods=["PUT"])
router.add_api_route("/{important_day_id}", delete_special_day, methods=["DELETE"], status_code=204)
