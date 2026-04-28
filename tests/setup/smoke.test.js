describe('test harness', () => {
  it('runs a baseline test', () => {
    expect(1 + 1).toBe(2);
  });

  it('can dynamically import frontend ES modules from Vitest', async () => {
    const icons = await import('../../public/js/modules/icons.js');
    expect(icons.ICONS).toBeTruthy();
  });
});
