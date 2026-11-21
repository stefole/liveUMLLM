const MermaidDiagramProvider = require('./MermaidDiagramProvider');

class ClassProvider extends MermaidDiagramProvider {
    generate(targetClassName, classes, language) {
        const lines = [];
        lines.push('classDiagram');
        lines.push('    direction LR');

        if (!classes || !Array.isArray(classes) || classes.length === 0) {
            if (targetClassName) {
                lines.push(`    class ${targetClassName}`);
            }
            return { mermaidCode: lines.join('\n'), classCount: 0, displayClassNames: [] };
        }

        const findAncestors = (className, result = new Set()) => {
            if (!className || result.has(className)) return result;
            const cls = classes.find(c => c.name === className);
            if (cls) {
                result.add(className);
                if (cls.parent) findAncestors(cls.parent, result);
                if (cls.interfaces) cls.interfaces.forEach(iface => findAncestors(iface, result));
            } else {
                result.add(className);
            }
            return result;
        };

        const findDescendants = (className, result = new Set(), visited = new Set()) => {
            if (!className || visited.has(className)) return result;
            visited.add(className);
            result.add(className);
            classes.forEach(c => {
                if (c.parent === className || (c.interfaces && c.interfaces.includes(className))) {
                    findDescendants(c.name, result, visited);
                }
            });
            return result;
        };

        const targetClass = classes.find(c => c.name === targetClassName) || classes[0];
        const displaySet = new Set();

        if (targetClass) {
            findAncestors(targetClass.name, displaySet);
            findDescendants(targetClass.name, displaySet);

            if (targetClass.parent) {
                classes.forEach(c => {
                    if (c.parent === targetClass.parent) displaySet.add(c.name);
                });
            }
            if (targetClass.interfaces) {
                targetClass.interfaces.forEach(iface => {
                    classes.forEach(c => {
                        if (c.interfaces && c.interfaces.includes(iface)) displaySet.add(c.name);
                    });
                });
            }

            const currentDisplay = Array.from(displaySet);
            currentDisplay.forEach(name => {
                const cls = classes.find(c => c.name === name);
                if (cls) {
                    if (cls.parent) displaySet.add(cls.parent);
                    if (cls.interfaces) cls.interfaces.forEach(i => displaySet.add(i));
                }
            });
        }

        const displayClasses = new Map();
        displaySet.forEach(name => {
            const cls = classes.find(c => c.name === name);
            if (cls) {
                displayClasses.set(name, cls);
            } else {
                const isInterface = classes.some(c =>
                    c.interfaces && c.interfaces.includes(name)
                );
                displayClasses.set(name, { name, isExternal: true, isInterface });
            }
        });

        lines.push('    classDef active fill:#0284C7,stroke:#0C4A6E,stroke-width:2px,color:#FFFFFF');
        lines.push('    classDef hint color:#3B82F6');

        displayClasses.forEach(c => {
            if (!c.name || !c.name.trim()) return;

            const isInterface = c.isInterface || classes.some(other =>
                other.interfaces && other.interfaces.includes(c.name) && !displayClasses.has(c.name)
            );

            const escapedName = c.name.replace(/[{}[\]<>]/g, '_');

            if (c.isExternal) {
                lines.push(`    class ${escapedName} {`);
                lines.push('        <<external>>');
                lines.push('    }');
            } else if (isInterface) {
                lines.push(`    class ${escapedName} {`);
                lines.push('        <<interface>>');
                lines.push('    }');
            } else {
                lines.push(`    class ${escapedName}`);
            }

            if (c.methods && c.methods.length > 0) {
                c.methods.forEach(m => {
                    const safeMethod = m.replace(/[{}[\]<>]/g, '_');
                    lines.push(`    ${escapedName} : +${safeMethod}()`);
                });
            }

            if (c.name === targetClassName) {
                lines.push(`    class ${escapedName}:::active`);
            }

            let hiddenSubclasses = 0;
            let hiddenParents = 0;

            classes.forEach(other => {
                if (other.parent === c.name || (other.interfaces && other.interfaces.includes(c.name))) {
                    if (!displaySet.has(other.name)) hiddenSubclasses++;
                }
            });

            if (c.parent && !displaySet.has(c.parent)) hiddenParents++;
            if (c.interfaces) {
                c.interfaces.forEach(i => {
                    if (!displaySet.has(i)) hiddenParents++;
                });
            }

            if (hiddenSubclasses > 0 || hiddenParents > 0) {
                const hints = [];
                if (hiddenParents > 0) {
                    const text = hiddenParents > 1 ? 'more parents' : 'more parent';
                    hints.push(`${hiddenParents} ${text}`);
                }
                if (hiddenSubclasses > 0) {
                    const text = hiddenSubclasses > 1 ? 'more children' : 'more child';
                    hints.push(`${hiddenSubclasses} ${text}`);
                }
                lines.push(`    ${escapedName} : ${hints.join(', ')} [+]`);
                if (c.name !== targetClassName) {
                    lines.push(`    class ${escapedName}:::hint`);
                }
            }
        });

        const renderedEdges = new Set();
        classes.forEach(c => {
            if (!c.name || !displayClasses.has(c.name)) return;
            const escChild = c.name.replace(/[{}[\]<>]/g, '_');
            if (c.parent && displayClasses.has(c.parent)) {
                const escParent = c.parent.replace(/[{}[\]<>]/g, '_');
                const edge = `${escParent} <|-- ${escChild}`;
                if (!renderedEdges.has(edge)) {
                    renderedEdges.add(edge);
                    lines.push(`    ${edge}`);
                }
            }
            if (c.interfaces) {
                c.interfaces.forEach(iface => {
                    if (displayClasses.has(iface)) {
                        const escIface = iface.replace(/[{}[\]<>]/g, '_');
                        const edge = `${escIface} <|.. ${escChild}`;
                        if (!renderedEdges.has(edge)) {
                            renderedEdges.add(edge);
                            lines.push(`    ${edge}`);
                        }
                    }
                });
            }
        });

        return {
            mermaidCode: lines.join('\n'),
            classCount: displayClasses.size,
            displayClassNames: Array.from(displaySet)
        };
    }
}

module.exports = ClassProvider;
