// Run with: truffle test
const FeedbackBoard = artifacts.require("FeedbackBoard");
const VisitCounter = artifacts.require("VisitCounter");

contract("FeedbackBoard", (accounts) => {
  const [owner, user] = accounts;
  let board;

  beforeEach(async () => { board = await FeedbackBoard.new({ from: owner }); });

  it("sets the deployer as owner", async () => {
    assert.equal(await board.owner(), owner);
  });

  it("starts empty", async () => {
    assert.equal((await board.getFeedbackCount()).toString(), "0");
    assert.equal((await board.getAverageRating()).toString(), "0");
  });

  it("stores feedback and calculates the average", async () => {
    await board.postFeedback("Ali", "Great course", 5, { from: user });
    await board.postFeedback("Sara", "Okay", 4, { from: owner });
    assert.equal((await board.getFeedbackCount()).toString(), "2");
    assert.equal((await board.getAverageRating()).toString(), "450"); // 4.50 x 100
    const f = await board.getFeedback(0);
    assert.equal(f[0], user);
    assert.equal(f[1], "Ali");
    assert.equal(f[2], "Great course");
  });

  it("rejects an invalid rating", async () => {
    try { await board.postFeedback("Ali", "Bad", 9, { from: user }); assert.fail("should revert"); }
    catch (e) { assert.include(e.message, "Rating must be 1 to 5"); }
  });

  it("only lets the owner clear the board", async () => {
    await board.postFeedback("Ali", "Hi", 3, { from: user });
    try { await board.clearFeedback({ from: user }); assert.fail("should revert"); }
    catch (e) { assert.include(e.message, "Only owner allowed"); }
    await board.clearFeedback({ from: owner });
    assert.equal((await board.getFeedbackCount()).toString(), "0");
  });
});

contract("VisitCounter", (accounts) => {
  it("counts visits", async () => {
    const c = await VisitCounter.new();
    await c.visit({ from: accounts[1] });
    await c.visit({ from: accounts[1] });
    assert.equal((await c.getVisits()).toString(), "2");
    assert.equal((await c.getMyVisits(accounts[1])).toString(), "2");
  });
});
