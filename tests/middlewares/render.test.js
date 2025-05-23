const renderMw = require("../../middlewares/render");

test("should initialize res.locals[view] if undefined", () => {
  const view = "testView";
  const res = {
    locals: {},
    render: jest.fn(),
  };
  const req = {};
  const next = jest.fn();

  renderMw({}, view)(req, res, next);

  expect(res.locals[view]).toEqual({});
  expect(res.render).toBeCalledWith(view, res.locals);
});

test("should not overwrite existing res.locals[view]", () => {
  const view = "testView";
  const existingData = { something: "value" };
  const res = {
    locals: {
      [view]: existingData,
    },
    render: jest.fn(),
  };
  const req = {};
  const next = jest.fn();

  renderMw({}, view)(req, res, next);

  expect(res.locals[view]).toBe(existingData);
  expect(res.render).toBeCalledWith(view, res.locals);
});
