"use client";

import React from "react";
import { Reveal } from "./Reveal";

export interface TimelineExperience {
  cargo: string;
  empresa: string;
  desc: string;
  periodo: string;
  icon: React.ReactNode;
  color: string;
}

interface TimelineItemProps {
  item: TimelineExperience;
  isLeft: boolean;
}

export const TimelineItem = ({ item, isLeft }: TimelineItemProps) => {
  return (
    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-14 group">
      <div
        className={`w-full md:w-5/12 ${isLeft ? "order-2 md:order-1 md:text-right pl-[88px] pr-4 md:pl-0 md:pr-12 mt-4 md:mt-0" : "order-2 md:order-3 text-left pl-[88px] pr-4 md:pl-12 md:pr-0 mt-4 md:mt-0"}`}
      >
        <Reveal direction={isLeft ? "right" : "left"} delay={100}>
          <div
            className={`p-6 rounded-[20px] border border-white/5 bg-[#0a0a0c]/80 backdrop-blur-md transition-all duration-500 hover:bg-[#15151a] hover:border-white/20 hover:shadow-2xl hover:scale-105`}
          >
            <h3 className="text-xl font-bold text-white mb-1">{item.cargo}</h3>
            <h4
              className="text-sm font-mono mb-3"
              style={{ color: item.color }}
            >
              {item.empresa}
            </h4>
            <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
          </div>
        </Reveal>
      </div>

      <div
        className={`absolute left-0 md:left-1/2 w-20 h-20 rounded-full flex items-center justify-center z-10 transform md:-translate-x-1/2 mt-1 md:mt-0 order-1 md:order-2`}
      >
        <Reveal direction="scale" delay={300}>
          <div
            className={`w-16 h-16 rounded-full border-[3px] backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:scale-125 group-hover:rotate-12 bg-[#020203]`}
            style={{
              borderColor: item.color,
              color: item.color,
              boxShadow: `0 0 30px ${item.color}40`,
            }}
          >
            {React.isValidElement(item.icon) &&
              React.cloneElement(item.icon as React.ReactElement<any>, {
                className: "w-7 h-7",
              })}
          </div>
        </Reveal>
      </div>

      <div
        className={`w-full md:w-5/12 ${isLeft ? "order-3 md:order-3 text-left pl-[88px] pr-4 md:pl-12 md:pr-0 font-mono text-lg mt-2 md:mt-0 text-gray-500" : "order-3 md:order-1 text-left md:text-right pl-[88px] pr-4 md:pl-0 md:pr-12 font-mono text-lg mt-2 md:mt-0 text-gray-500"}`}
      >
        <Reveal direction={isLeft ? "left" : "right"} delay={200}>
          <span className="bg-[#0a0a0c] px-4 py-2 rounded-full border border-white/5">
            {item.periodo}
          </span>
        </Reveal>
      </div>
    </div>
  );
};
