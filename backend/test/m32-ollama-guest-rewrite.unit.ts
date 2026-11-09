import assert from 'node:assert/strict';
import {groundedGuestRewriteIsSafe} from '../src/agent/generative';

const base='I have the date 17/11/2026 and 200 guests recorded. The team must verify capacity and availability. No reservation has been made.';
assert.equal(groundedGuestRewriteIsSafe(
  'Thanks for the details! I have 17/11/2026 and 200 guests noted. Our team must verify capacity and availability. No reservation has been made.',base),true);
assert.equal(groundedGuestRewriteIsSafe(
  'I have 18/11/2026 and 200 guests noted. Our team must verify capacity. No reservation has been made.',base),false,'date mismatch rejected');
assert.equal(groundedGuestRewriteIsSafe(
  'I have 17/11/2026 and 300 guests noted. Our team must verify capacity. No reservation has been made.',base),false,'guest count mismatch rejected');
assert.equal(groundedGuestRewriteIsSafe(
  'I have 17/11/2026 and 200 guests. Your booking is confirmed.',base),false,'confirmed booking rejected');
assert.equal(groundedGuestRewriteIsSafe(
  'I have 17/11/2026 and 200 guests. The venue will accommodate everyone. No reservation has been made.',base),false,'capacity promise rejected');
assert.equal(groundedGuestRewriteIsSafe(
  'I have 17/11/2026 and 200 guests. Our team will verify capacity and availability.',base),false,'missing no-reservation caution rejected');
assert.equal(groundedGuestRewriteIsSafe(
  'Thinking... I have 17/11/2026 and 200 guests. No reservation has been made.',base),false,'reasoning text rejected');
assert.equal(groundedGuestRewriteIsSafe(
  'Thanks for the details! I have 17/11/2026 and 200 guests noted. The additional cost will be ₹5000. Our team will verify availability; no reservation has been made.',base),false,'invented price rejected');
console.log('M32 grounded Ollama rewrite safety tests passed');
