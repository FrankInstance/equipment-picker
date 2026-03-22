import { useEffect, useMemo, useState } from "react";
import { ATTRIBUTE_LABELS, EQUIPMENT_DATA } from "./data/equipment-data";
import { UI_TEXT as TEXT } from "./constants/ui-text";

const PLACEHOLDER_IMAGE = (() => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#2b3b4f" />
        <stop offset="100%" stop-color="#101722" />
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="18" fill="url(#g)" />
    <path d="M20 120 L70 70 L95 95 L125 65 L140 80" stroke="#72c1ff" stroke-width="4" fill="none" opacity="0.7" />
    <text x="50%" y="55%" text-anchor="middle" fill="#a5b3c8" font-size="14" font-family="Arial">NO IMAGE</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
})();

const NON_REFINABLE_KEYS = new Set(["defense"]);

const resolveSlot = (item) => {
  if (String(item.id).startsWith("armor_")) {
    return TEXT.armor;
  }

  if (String(item.id).startsWith("gloves_")) {
    return TEXT.gloves;
  }

  if (String(item.id).startsWith("accessory_")) {
    return TEXT.accessory;
  }

  return TEXT.unknown;
};

const SLOT_FILTERS = [
  { label: TEXT.all, value: "all" },
  { label: TEXT.armor, value: TEXT.armor },
  { label: TEXT.gloves, value: TEXT.gloves },
  { label: TEXT.accessory, value: TEXT.accessory }
].filter(
  (slot, index, list) =>
    slot.label &&
    !slot.label.includes("?") &&
    list.findIndex((item) => item.value === slot.value) === index
);

const normalizeEquipment = (item) => ({
  id: item.id ?? item.name,
  name: item.name ?? TEXT.unnamed,
  slot: resolveSlot(item),
  image: item.image || "",
  attributes: Array.isArray(item.attributes)
    ? item.attributes.map((attr) => ({
        key: attr.key ?? "unknown",
        label: attr.label ?? ATTRIBUTE_LABELS[attr.key] ?? attr.key,
        value: String(attr.value ?? "0"),
        sortValue: Number(attr.sortValue ?? 0)
      }))
    : []
});

const renderAttrValue = (attr) => `${attr.label} ${attr.value}`;

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [activeSlot, setActiveSlot] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedData = useMemo(() => EQUIPMENT_DATA.map(normalizeEquipment), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filteredEquipment = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return normalizedData.filter((item) => {
      const matchSlot = activeSlot === "all" || item.slot === activeSlot;
      const haystack = [
        item.name,
        item.slot,
        ...item.attributes.map((attr) => attr.label),
        ...item.attributes.map((attr) => attr.key)
      ]
        .join(" ")
        .toLowerCase();
      return matchSlot && (!term || haystack.includes(term));
    });
  }, [activeSlot, normalizedData, searchTerm]);

  const recommendations = useMemo(() => {
    if (!selectedEquipment) {
      return [];
    }

    const candidates = normalizedData.filter((item) => item.slot === selectedEquipment.slot);

    return selectedEquipment.attributes
      .filter((attr) => !NON_REFINABLE_KEYS.has(attr.key))
      .map((attr) => {
        const list = candidates
          .map((item) => {
            const match = item.attributes.find((candidateAttr) => candidateAttr.key === attr.key);
            if (!match) {
              return null;
            }

            return {
              item,
              attribute: match,
              fitLevel: match.sortValue > attr.sortValue ? "better" : "standard"
            };
          })
          .filter(Boolean)
          .sort((a, b) => b.attribute.sortValue - a.attribute.sortValue)
          .slice(0, 6);

        return { attribute: attr, list };
      });
  }, [normalizedData, selectedEquipment]);

  const handleSelect = (item) => {
    setSelectedEquipment(item);
    setIsOpen(false);
  };

  return (
    <>
      <div className="backdrop"></div>

      <main className="page">
        <header className="hero">
          <p className="eyebrow">ARKNIGHTS: ENDFIELD</p>
          <h1>{TEXT.title}</h1>
        </header>

        <section className="layout">
          <div className="panel panel--primary">
            <div className="panel__header">
              <h2>{TEXT.current}</h2>
              <button className="primary-btn" type="button" onClick={() => setIsOpen(true)}>
                {TEXT.choose}
              </button>
            </div>

            <div className={`selected-card ${selectedEquipment ? "" : "is-empty"}`}>
              {selectedEquipment ? (
                <>
                  <div
                    className="selected-card__media"
                    style={{
                      backgroundImage: `url('${selectedEquipment.image || PLACEHOLDER_IMAGE}')`
                    }}
                  ></div>
                  <div className="selected-card__info">
                    <p className="label">{selectedEquipment.slot}</p>
                    <p className="value">{selectedEquipment.name}</p>
                  </div>
                </>
              ) : (
                <div className="selected-card__info">
                  <p className="label">{TEXT.unselected}</p>
                  <p className="value">{TEXT.chooseHint}</p>
                </div>
              )}
            </div>

            <div className="stats">
              {selectedEquipment?.attributes.map((attr) => (
                <div className="stat-row" key={attr.key} title={attr.key}>
                  <span>{attr.label}</span>
                  <span>{attr.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel__header">
              <h2>{TEXT.recommendation}</h2>
              <p className="panel__hint">{TEXT.recommendationHint}</p>
            </div>
            <div className={`recommendations ${selectedEquipment ? "" : "is-empty"}`}>
              {!selectedEquipment ? (
                <p className="empty">{TEXT.recommendationEmpty}</p>
              ) : (
                recommendations.map(({ attribute, list }) => (
                  <div className="recommendation-card" key={attribute.key}>
                    <h3>
                      {attribute.label}
                      {TEXT.recommendationTitleSuffix}
                    </h3>
                    <div className="sub">
                      {TEXT.recommendationSubPrefix}
                      {attribute.value}
                      {TEXT.recommendationSubMiddle}
                    </div>
                    <div className="reco-list">
                      {list.length === 0 ? (
                        <p className="empty">{TEXT.recommendationUnavailable}</p>
                      ) : (
                        list.map(({ item, attribute: matchedAttr, fitLevel }) => (
                          <div className="reco-item" key={`${attribute.key}-${item.id}`}>
                            <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} />
                            <div className="reco-item__info">
                              <strong>{item.name}</strong>
                              <span>
                                {matchedAttr.label} {matchedAttr.value}{" "}
                                <em className={`fit-badge fit-badge--${fitLevel}`}>
                                  {fitLevel === "better" ? TEXT.fitBetter : TEXT.fitStandard}
                                </em>
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </main>

      <div
        id="overlay"
        className={`overlay ${isOpen ? "is-open" : ""}`}
        aria-hidden={!isOpen}
        onClick={(event) => {
          if (event.target.id === "overlay") {
            setIsOpen(false);
          }
        }}
      >
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
          <header className="modal__header">
            <div>
              <p className="eyebrow">{TEXT.library}</p>
              <h2 id="modalTitle">{TEXT.choose}</h2>
            </div>
            <button className="ghost-btn" type="button" aria-label={TEXT.close} onClick={() => setIsOpen(false)}>
              {TEXT.close}
            </button>
          </header>

          <div className="modal__tools">
            <input
              className="search"
              type="search"
              placeholder={TEXT.searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <div className="filters" role="tablist" aria-label={TEXT.slotFilter}>
              {SLOT_FILTERS.map((slot) => (
                <button
                  key={slot.value}
                  className={`filter-btn ${activeSlot === slot.value ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveSlot(slot.value)}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal__body">
            <ul className="equipment-list" role="listbox" aria-label={TEXT.equipmentList}>
              {filteredEquipment.length === 0 ? (
                <li className="empty">{TEXT.searchEmpty}</li>
              ) : (
                filteredEquipment.map((item) => (
                  <li key={item.id} className="equipment-item" role="option" onClick={() => handleSelect(item)}>
                    <img src={item.image || PLACEHOLDER_IMAGE} alt={item.name} />
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.attributes.map((attr) => renderAttrValue(attr)).join(" / ")}</p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
