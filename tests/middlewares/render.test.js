const renderMW = require('../../middlewares/render');

describe('render', () => {
  it('renders the named view with res.locals', () => {
    const res = { locals: { adventures: [] }, render: jest.fn() };
    renderMW({}, 'adventures')({}, res);
    expect(res.render).toHaveBeenCalledWith('adventures', res.locals);
  });

  it('leaves a status set by an earlier middleware alone', () => {
    const res = { locals: {}, render: jest.fn(), status: jest.fn() };
    renderMW({}, 'adventureForm')({}, res);
    expect(res.status).not.toHaveBeenCalled();
  });
});
