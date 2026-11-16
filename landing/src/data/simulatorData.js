export const SAMPLE_COMMAND = 'pytest tests/system -v';
export const SAMPLE_DIRECTORY = 'D:\\AgentWatch\\tests';

export const PRIOR_TERMINAL_LOGS = [
  { type: 'sys', tag: 'session', text: 'attached: gemini-antigravity (port 9000)' },
  { type: 'thought', tag: 'thought', text: 'Inspecting tailnet peer verification test suite...' },
  { type: 'tool', tag: 'tool', text: 'git diff --stat services/tailscale_service.py' },
  { type: 'out', tag: 'stdout', text: '1 file changed, 2 insertions(+), 1 deletion(-)' },
];

export const SAMPLE_TERMINAL = [
  'collected 4 items',
  'tests/test_session_events.py::test_detects_pause PASSED     [ 25%]',
  'tests/test_session_events.py::test_ignores_idle PASSED      [ 50%]',
  'tests/test_dispatch.py::test_allow PASSED                   [ 75%]',
  'tests/test_dispatch.py::test_deny PASSED                    [100%]',
  '========================= 4 passed in 1.82s =========================',
];

export const SAMPLE_QUESTION = {
  prompt: 'Which auth provider should we integrate first?',
  options: [
    { id: 'tailscale', title: 'Tailscale identity', sub: 'Verify the peer from the tailnet' },
    { id: 'token', title: 'Local session token', sub: 'Bearer token in a request header' },
  ],
};

// Each file is a list of rows. `gap` rows are collapsed context the viewer can expand.
export const SAMPLE_DIFF_FILES = [
  {
    path: 'services/tailscale_service.py',
    rows: [
      { t: 'hunk', text: '@@ -22,6 +22,7 @@ class TailscaleService' },
      { t: 'gap', hidden: [[18, 'import logging'], [19, ''], [20, 'log = logging.getLogger(__name__)'], [21, '']] },
      { t: 'ctx', a: 22, b: 22, text: '    def verify_peer(self, ip):' },
      { t: 'del', a: 23, text: '        pass' },
      { t: 'add', b: 23, text: '        peer = self.client.whois(ip)' },
      { t: 'add', b: 24, text: '        return peer is not None and peer.authenticated' },
      { t: 'ctx', a: 24, b: 25, text: '' },
      { t: 'ctx', a: 25, b: 26, text: '    def logout(self):' },
    ],
  },
  {
    path: 'tests/test_tailscale_service.py',
    rows: [
      { t: 'hunk', text: '@@ -0,0 +1,6 @@' },
      { t: 'add', b: 1, text: 'from services.tailscale_service import TailscaleService' },
      { t: 'add', b: 2, text: '' },
      { t: 'add', b: 3, text: 'def test_unknown_peer_is_rejected(fake_client):' },
      { t: 'add', b: 4, text: '    svc = TailscaleService(fake_client)' },
      { t: 'add', b: 5, text: '    fake_client.whois.return_value = None' },
      { t: 'add', b: 6, text: '    assert svc.verify_peer("100.64.0.9") is False' },
    ],
  },
];
