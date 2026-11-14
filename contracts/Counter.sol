// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Visit Counter (bonus: second contract)
/// @notice Counts how many times people pressed "I visited". Shows deploying multiple contracts with Truffle.
contract VisitCounter {
    uint public visits;                          // total visits
    mapping(address => uint) public visitsOf;    // visits per wallet

    event Visited(address indexed visitor, uint totalVisits);

    // WRITE: register a visit
    function visit() public {
        visits += 1;
        visitsOf[msg.sender] += 1;
        emit Visited(msg.sender, visits);
    }

    // READ: total visits
    function getVisits() public view returns (uint) {
        return visits;
    }

    // READ: visits made by one wallet
    function getMyVisits(address _who) public view returns (uint) {
        return visitsOf[_who];
    }
}
