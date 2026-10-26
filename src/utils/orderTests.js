// An order's tests live in two places: test_lines (processing lab) and
// outsource_orders[].lines (sent to an outsource lab). Anything that lists
// "the patient's tests" — messages, technician views — wants both.

export function outsourceLines(order) {
  return (order?.outsource_orders ?? []).flatMap((oo) => oo.lines.map((l) => ({ ...l, outsourceLabName: oo.outsourceLabName })));
}

export function allTestNames(order) {
  return [
    ...(order?.test_lines ?? []).map((l) => l.testName),
    ...outsourceLines(order).map((l) => l.testName),
  ];
}
