import { Room } from '../room';

export const findRoomIdByUserId = (
  userId: number,
  roomsMap: Map<number, Room>
): number | undefined => {
  for (const room of roomsMap) {
    for (const user of room[1].roomUsers) {
      if (user.id === userId) {
        return room[1].roomId;
      }
    }
  }
  return undefined;
};
