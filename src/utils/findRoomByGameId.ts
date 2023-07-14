import { Room } from '../room';

export const findRoomIdByGameId = (
  gameId: number,
  roomsMap: Map<number, Room>
): number | undefined => {
  for (const room of roomsMap) {
    if (gameId === room[1].game?.gameId) {
      return room[1].roomId;
    }
  }
  return undefined;
};
