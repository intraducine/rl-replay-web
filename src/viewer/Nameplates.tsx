import { Html } from "@react-three/drei";
import type { ReplayPlayer, SampledReplayState } from "../replay/types";
import { teamClassName } from "./teamColors";

export function Nameplates({ sample, players, selectedPlayerId }: { sample: SampledReplayState; players: ReplayPlayer[]; selectedPlayerId?: string }) {
  return (
    <>
      {players.map((player) => {
        const car = sample.cars[player.id];
        if (!car) return null;
        return (
          <Html key={player.id} position={[car.position[0], car.position[1] + 150, car.position[2]]} center distanceFactor={14}>
            <div className={`nameplate ${teamClassName(player.team)} ${selectedPlayerId === player.id ? "selected" : ""}`}>
              {player.name}
            </div>
          </Html>
        );
      })}
      {Object.entries(sample.cars).map(([id, car], index) => {
        if (players.some((player) => player.id === id)) return null;
        return (
          <Html key={id} position={[car.position[0], car.position[1] + 150, car.position[2]]} center distanceFactor={14}>
            <div className="nameplate">{id.startsWith("actor-") ? `Car ${index + 1}` : id}</div>
          </Html>
        );
      })}
    </>
  );
}
