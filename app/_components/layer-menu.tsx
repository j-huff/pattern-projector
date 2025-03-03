import { Layer } from "@/_lib/layer";
import { Dispatch, SetStateAction, useMemo } from "react";
import { IconButton } from "@/_components/buttons/icon-button";
import CloseIcon from "@/_icons/close-icon";

export default function LayerMenu({
  className,
  layers,
  setLayers,
  visible,
  setVisible,
}: {
  className?: string | undefined;
  setLayers: Dispatch<SetStateAction<Map<string, Layer>>>;
  layers: Map<string, Layer>;
  visible: boolean;
  setVisible: (visible: boolean) => void;
}) {
  function handleOnChange(key: string, layer: Layer) {
    layer.visible = !layer.visible;
    setLayers(new Map(layers.set(key, layer)));
  }

  const globalCheck = useMemo((): boolean => {
    const layerArray = [...layers.entries()];
    return layerArray.filter((e) => e[1].visible).length === layerArray.length;
  }, [layers]);

  function handleGlobalChange(checked: boolean) {
    const newMap = new Map();
    layers.forEach((value, key) => {
      value.visible = checked;
      newMap.set(key, value);
    });
    setLayers(newMap);
  }

  return (
    <menu
      className={
        "w-48 text-sm font-medium text-gray-900 bg-white border border-gray-200 border-top-0 absolute top-16 z-50 " +
        `${visible ? "left-0" : "-left-60"} absolute transition-all duration-700` +
        className
      }
    >
      <li key="global" className="w-full border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between ps-3">
          <input
            id="global"
            type="checkbox"
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            checked={globalCheck}
            style={{ width: 14 }}
            onChange={(e) => handleGlobalChange(e.target.checked)}
          />
          <IconButton onClick={() => setVisible(false)}>
            <CloseIcon ariaLabel="close" />
          </IconButton>
        </div>
      </li>
      {[...layers.entries()].map((e) => (
        <li key={e[0]} className="w-full border-b border-gray-200 rounded-t-lg">
          <div className="flex items-center ps-3">
            <input
              id={e[0]}
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
              checked={e[1].visible}
              onChange={() => handleOnChange(e[0], e[1])}
            ></input>
            <label
              htmlFor={e[0]}
              className="w-full py-3 ms-2 text-sm font-medium text-gray-90"
            >
              {e[1].name}
            </label>
          </div>
        </li>
      ))}
    </menu>
  );
}
