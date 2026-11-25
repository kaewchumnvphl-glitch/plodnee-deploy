// Minimal PromptPay EMVCo QR payload generator (phone number + optional amount).
// Format reference: BOT PromptPay QR standard (EMVCo).

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return `0066${digits.slice(1)}`;
  }
  if (digits.length === 13 && digits.startsWith("0066")) {
    return digits;
  }
  return null;
}

export function buildPromptPayPayload(phone: string, amountThb?: number): string | null {
  const target = normalizePhone(phone);
  if (!target) return null;

  const merchant = tlv("00", "A000000677010111") + tlv("01", target);
  let payload =
    tlv("00", "01") +
    tlv("01", amountThb && amountThb > 0 ? "12" : "11") +
    tlv("29", merchant) +
    tlv("53", "764");

  if (amountThb && amountThb > 0) {
    const amt = Number.isInteger(amountThb) ? String(amountThb) : amountThb.toFixed(2);
    payload += tlv("54", amt);
  }

  payload += tlv("58", "TH") + "6304";
  return payload + crc16ccitt(payload);
}
