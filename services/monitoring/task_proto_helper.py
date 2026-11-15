"""Helper utility for extracting task details from Antigravity protobuf blobs."""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def decode_protobuf_wire(data: bytes) -> Dict[int, List[Any]]:
    """
    Lightweight, dependency-free Protobuf wire decoder.
    Extracts varints (wire 0) and length-delimited bytes (wire 2).
    """
    fields: Dict[int, List[Any]] = {}
    i = 0
    length = len(data)

    while i < length:
        # Varint decoding for tag
        tag = 0
        shift = 0
        while True:
            if i >= length:
                return fields
            byte = data[i]
            i += 1
            tag |= (byte & 0x7F) << shift
            shift += 7
            if not (byte & 0x80):
                break

        field_num = tag >> 3
        wire_type = tag & 0x7

        if wire_type == 0:  # Varint
            val = 0
            shift = 0
            while True:
                if i >= length:
                    return fields
                byte = data[i]
                i += 1
                val |= (byte & 0x7F) << shift
                shift += 7
                if not (byte & 0x80):
                    break
            fields.setdefault(field_num, []).append(val)

        elif wire_type == 2:  # Length-delimited bytes
            field_len = 0
            shift = 0
            while True:
                if i >= length:
                    return fields
                byte = data[i]
                i += 1
                field_len |= (byte & 0x7F) << shift
                shift += 7
                if not (byte & 0x80):
                    break

            if i + field_len > length:
                val = data[i:]
                i = length
            else:
                val = data[i : i + field_len]
                i += field_len
            fields.setdefault(field_num, []).append(val)

        elif wire_type == 1:  # 64-bit fixed
            i += 8
        elif wire_type == 5:  # 32-bit fixed
            i += 4
        else:
            # Unsupported wire type or corrupted stream
            break

    return fields


def parse_task_details_blob(blob: bytes) -> Dict[str, Any]:
    """
    Parse Antigravity task_details protobuf blob into structured fields.
    Field mapping:
      1: task_id (str)
      2: log_uri (str)
      4: command (str)
      6: is_daemon (int)
      7: summary (str)
    """
    if not blob:
        return {}

    try:
        fields = decode_protobuf_wire(blob)

        def _get_str(f_num: int) -> str:
            vals = fields.get(f_num, [])
            if vals and isinstance(vals[0], (bytes, bytearray)):
                return vals[0].decode("utf-8", errors="ignore").strip()
            return ""

        def _get_int(f_num: int) -> int:
            vals = fields.get(f_num, [])
            if vals and isinstance(vals[0], int):
                return vals[0]
            return 0

        return {
            "task_id": _get_str(1),
            "log_uri": _get_str(2),
            "command": _get_str(4),
            "is_daemon": bool(_get_int(6)),
            "summary": _get_str(7),
        }
    except Exception as exc:
        logger.debug("Failed to decode task_details protobuf: %s", exc)
        return {}
